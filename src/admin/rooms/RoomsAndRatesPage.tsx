import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { DriverDormManager } from "./DriverDormManager.js";
import { QrLocationManager } from "./QrLocationManager.js";
import { QrPrintSheetModal } from "./QrPrintSheetModal.js";
import { RateMatrixGrid } from "./RateMatrixGrid.js";
import { RateSimulatorDialog } from "./RateSimulatorDialog.js";
import { RoomInventoryGrid } from "./RoomInventoryGrid.js";
import { RoomTypeManager } from "./RoomTypeManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type RoomsTabId =
  | "PHYSICAL_ROOMS"
  | "ROOM_TYPES"
  | "RATE_MATRIX"
  | "DRIVER_DORM"
  | "QR_PRINT";

export interface RoomsTab {
  readonly id: RoomsTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly badge?: string | undefined;
}

export interface RoomsAndRatesPageProps {
  readonly initialTab?: RoomsTabId | undefined;
  readonly propertyTitle?: string | undefined;
  readonly onTabChange?: ((tabId: RoomsTabId) => void) | undefined;
  readonly onActionNotify?: ((title: string, message: string) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Tab Definitions
// ============================================================================

export const ROOMS_TABS: ReadonlyArray<RoomsTab> = [
  {
    id: "PHYSICAL_ROOMS",
    label: "Physical Rooms & Inventory",
    shortLabel: "Rooms",
    description: "Manage hotel room numbers, villa inventory, and housekeeping status.",
  },
  {
    id: "ROOM_TYPES",
    label: "Room Categories & Capacities",
    shortLabel: "Categories",
    description: "Configure Deluxe, Suite, Villa categories, guest capacities, and amenities.",
  },
  {
    id: "RATE_MATRIX",
    label: "Dual-Currency Rates & Meal Plans",
    shortLabel: "Tariffs",
    description:
      "Resident LKR and foreign USD tariffs, RO/BB/HB/FB meal plans, and CBSL conversion.",
    badge: "Dual-Currency",
  },
  {
    id: "DRIVER_DORM",
    label: "Driver Dorms & Chauffeur Quarters",
    shortLabel: "Driver Beds",
    description: "Chauffeur bunk accommodation, outside dorm allowances, and driver lodging rules.",
    badge: "Sri Lanka Standard",
  },
  {
    id: "QR_PRINT",
    label: "Contactless QR Standees & Tents",
    shortLabel: "QR Print",
    description:
      "Printable room standees, pool cabana stickers, and restaurant table tents with LankaQR.",
  },
];

export const ROOMS_SEGMENTED_OPTIONS: ReadonlyArray<SegmentedControlOption<RoomsTabId>> = [
  { id: "PHYSICAL_ROOMS", label: "Rooms" },
  { id: "ROOM_TYPES", label: "Categories" },
  { id: "RATE_MATRIX", label: "Rates & Meal Plans" },
  { id: "DRIVER_DORM", label: "Driver Dorms" },
  { id: "QR_PRINT", label: "QR Stands" },
];

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface RoomsHeaderProps {
  readonly propertyTitle: string;
  readonly activeTabInfo: RoomsTab;
  readonly onOpenSimulator: () => void;
  readonly onOpenQrPrint: () => void;
}

function RoomsHeader({
  propertyTitle,
  activeTabInfo,
  onOpenSimulator,
  onOpenQrPrint,
}: RoomsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {propertyTitle} — {activeTabInfo.label}
          </h1>
          {activeTabInfo.badge && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-apple-blue/10 text-apple-blue">
              {activeTabInfo.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {activeTabInfo.description}
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
        <button
          type="button"
          onClick={onOpenSimulator}
          className="min-h-[44px] apple-touch-target px-4 py-2 rounded-xl text-xs font-semibold bg-apple-blue text-white hover:brightness-110 shadow-xs transition-apple-spring cursor-pointer flex items-center gap-1.5"
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
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span>Rate Quote Simulator</span>
        </button>

        <button
          type="button"
          onClick={onOpenQrPrint}
          className="min-h-[44px] apple-touch-target px-3.5 py-2 rounded-xl text-xs font-semibold apple-liquid-glass text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 transition-apple-spring cursor-pointer flex items-center gap-1.5"
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
          <span>Print QR Sheets</span>
        </button>
      </div>
    </div>
  );
}

interface RoomsTabContentProps {
  readonly activeTab: RoomsTabId;
  readonly onNotify?: ((title: string, message: string) => void) | undefined;
}

function RoomsTabContent({ activeTab, onNotify }: RoomsTabContentProps) {
  switch (activeTab) {
    case "PHYSICAL_ROOMS":
      return (
        <RoomInventoryGrid
          onSaveRooms={() => {
            onNotify?.("Rooms Updated", "Physical inventory grid saved successfully");
          }}
        />
      );
    case "ROOM_TYPES":
      return (
        <RoomTypeManager
          onSave={() => {
            onNotify?.("Room Categories Updated", "Category specifications and amenities saved");
          }}
        />
      );
    case "RATE_MATRIX":
      return (
        <RateMatrixGrid
          onSave={() => {
            onNotify?.("Tariff Matrix Updated", "Resident LKR & Foreign USD meal plans updated");
          }}
        />
      );
    case "DRIVER_DORM":
      return (
        <DriverDormManager
          onSave={() => {
            onNotify?.("Driver Quarters Updated", "Chauffeur bunk roster and policies saved");
          }}
        />
      );
    case "QR_PRINT":
      return (
        <QrLocationManager
          onSaveLocations={() => {
            onNotify?.("QR Locations Updated", "Room & table QR stands updated");
          }}
        />
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function RoomsAndRatesPage({
  initialTab = "PHYSICAL_ROOMS",
  propertyTitle = "Galle Fort Lighthouse Villa",
  onTabChange,
  onActionNotify,
  className = "",
}: RoomsAndRatesPageProps) {
  const [activeTab, setActiveTab] = useState<RoomsTabId>(initialTab);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isQrPrintOpen, setIsQrPrintOpen] = useState<boolean>(false);

  const activeTabInfo = ROOMS_TABS.find((t) => t.id === activeTab) ?? (ROOMS_TABS[0] as RoomsTab);

  const handleTabSelect = (tabId: RoomsTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 font-sf-pro ${className}`}>
      {/* Header and Quick Action Triggers */}
      <RoomsHeader
        propertyTitle={propertyTitle}
        activeTabInfo={activeTabInfo}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenQrPrint={() => setIsQrPrintOpen(true)}
      />

      {/* Apple HIG Segmented Navigation */}
      <GlassCard material="regular" radius="xl" className="p-2">
        <SegmentedControl
          options={ROOMS_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
        />
      </GlassCard>

      {/* Active Room Sub-Module View */}
      <div className="transition-apple-spring">
        <RoomsTabContent activeTab={activeTab} onNotify={onActionNotify} />
      </div>

      {/* Interactive Rate Quote Simulator Sheet Dialog */}
      <RateSimulatorDialog
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        hotelName={propertyTitle}
      />

      {/* QR Sheet Print Preview Dialog */}
      <QrPrintSheetModal
        isOpen={isQrPrintOpen}
        onClose={() => setIsQrPrintOpen(false)}
        hotelName={propertyTitle}
      />
    </div>
  );
}
