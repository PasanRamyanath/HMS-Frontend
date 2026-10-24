import { useEffect, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
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
// Sub-Components
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
    <AdminPageHeader
      title={`${propertyTitle} — ${activeTabInfo.label}`}
      subtitle={activeTabInfo.description}
      propertyTitle={propertyTitle}
      statusBadge={
        activeTabInfo.badge ? { label: activeTabInfo.badge, variant: "success" } : undefined
      }
      actions={
        <>
          <button
            type="button"
            onClick={onOpenQrPrint}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
          >
            Print QR Sheets
          </button>

          <button
            type="button"
            onClick={onOpenSimulator}
            className="admin-btn-primary min-h-[38px] text-xs cursor-pointer"
          >
            Rate Quote Simulator
          </button>
        </>
      }
    />
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

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const activeTabInfo = ROOMS_TABS.find((t) => t.id === activeTab) ?? (ROOMS_TABS[0] as RoomsTab);

  const handleTabSelect = (tabId: RoomsTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={`space-y-5 font-sf-pro ${className}`}>
      {/* Header and Quick Action Triggers */}
      <RoomsHeader
        propertyTitle={propertyTitle}
        activeTabInfo={activeTabInfo}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenQrPrint={() => setIsQrPrintOpen(true)}
      />

      {/* Segmented Navigation */}
      <div className="border-b border-slate-200 pb-3 overflow-x-auto">
        <SegmentedControl
          options={ROOMS_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          className="w-full sm:w-auto"
        />
      </div>

      {/* Active Room Sub-Module View */}
      <div>
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
