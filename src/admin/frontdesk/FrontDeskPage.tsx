import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { SearchSvgIcon } from "../../components/SvgIcons.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import {
  CancelReservationDialog,
  type CancelReservationPayload,
  type CancelReservationReservation,
} from "./CancelReservationDialog.js";
import { type DmcContract, DmcContractManager } from "./DmcContractManager.js";
import { DriverQuartersBoard, type DriverQuartersEntry } from "./DriverQuartersBoard.js";
import { type DailyGuestEntry, FrontDeskDailyBoard } from "./FrontDeskDailyBoard.js";
import { GuestCrmDrawer, type GuestProfile } from "./GuestCrmDrawer.js";
import { type ForecastReservation, MealPlanForecastCard } from "./MealPlanForecastCard.js";
import { ModifyStayDialog, type ModifyStayPayload } from "./ModifyStayDialog.js";
import { type PoliceBCardEntry, PoliceBCardRegister } from "./PoliceBCardRegister.js";
import { PrintableRegCard, type PrintableRegCardData } from "./PrintableRegCard.js";
import { type ReservationFormData, ReservationModal } from "./ReservationModal.js";
import { TapeChartGrid, type TapeChartReservation, type TapeChartRoom } from "./TapeChartGrid.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type FrontDeskTabId =
  | "TAPE_CHART"
  | "DAILY_BOARD"
  | "DRIVER_QUARTERS"
  | "MEAL_FORECAST"
  | "POLICE_REGISTER"
  | "DMC_CONTRACTS";

export interface FrontDeskTab {
  readonly id: FrontDeskTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly shortcutKey: string;
  readonly badge?: string | undefined;
}

export interface FrontDeskPageProps {
  readonly hotelName?: string | undefined;
  readonly initialTab?: FrontDeskTabId | undefined;
  readonly rooms?: readonly TapeChartRoom[] | undefined;
  readonly reservations?: readonly TapeChartReservation[] | undefined;
  readonly dailyEntries?: readonly DailyGuestEntry[] | undefined;
  readonly driverEntries?: readonly DriverQuartersEntry[] | undefined;
  readonly mealReservations?: readonly ForecastReservation[] | undefined;
  readonly policeEntries?: readonly PoliceBCardEntry[] | undefined;
  readonly dmcContracts?: readonly DmcContract[] | undefined;
  readonly crmGuests?: readonly GuestProfile[] | undefined;
  readonly onTabChange?: ((tabId: FrontDeskTabId) => void) | undefined;
  readonly onActionNotify?: ((title: string, message: string) => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Tab Definitions
// ============================================================================

export const FRONT_DESK_TABS: readonly FrontDeskTab[] = [
  {
    id: "TAPE_CHART",
    label: "Tape Chart & Grid",
    shortLabel: "Tape Chart",
    description:
      "Interactive 14/30-day room rack calendar, driver dorm beds, meal plans, and Tourist Police B-Cards",
    shortcutKey: "1",
    badge: "14D / 30D",
  },
  {
    id: "DAILY_BOARD",
    label: "Daily Arrivals & In-House",
    shortLabel: "Daily Board",
    description:
      "Daily arrivals board, chauffeur dormitory beds, meal plan headcount, and Tourist Police B-Cards",
    shortcutKey: "2",
    badge: "4",
  },
  {
    id: "DRIVER_QUARTERS",
    label: "Chauffeur / Driver Quarters",
    shortLabel: "Driver Beds",
    description: "Driver dorm occupancy, meal allowances, gate passes, and porch SMS.",
    shortcutKey: "3",
    badge: "8/12",
  },
  {
    id: "MEAL_FORECAST",
    label: "Kitchen Meal Forecast",
    shortLabel: "Meal Forecast",
    description: "Kitchen buffet and dining headcount breakdown across RO/BB/HB/FB/AI.",
    shortcutKey: "4",
    badge: "72 Pax",
  },
  {
    id: "POLICE_REGISTER",
    label: "Tourist Police B-Card Register",
    shortLabel: "Police B-Card",
    description: "Statutory Foreign Arrival Register and Section 33 immigration ledger.",
    shortcutKey: "5",
    badge: "100% OK",
  },
  {
    id: "DMC_CONTRACTS",
    label: "DMC & Tour Operators",
    shortLabel: "DMC Contracts",
    description: "Travel agent contracted rates, credit limits, and split-folio rules.",
    shortcutKey: "6",
  },
];

export const FRONT_DESK_SEGMENTED_OPTIONS: readonly SegmentedControlOption<FrontDeskTabId>[] = [
  { id: "TAPE_CHART", label: "Tape Chart", badge: "14D / 30D" },
  { id: "DAILY_BOARD", label: "Daily Board", badge: "4" },
  { id: "DRIVER_QUARTERS", label: "Driver Beds", badge: "8/12" },
  { id: "MEAL_FORECAST", label: "Meal Plan", badge: "72 Pax" },
  { id: "POLICE_REGISTER", label: "Police B-Card", badge: "100% OK" },
  { id: "DMC_CONTRACTS", label: "DMC / Tours" },
];

const DEFAULT_FRONT_DESK_TAB: FrontDeskTab = {
  id: "TAPE_CHART",
  label: "Tape Chart & Grid",
  shortLabel: "Tape Chart",
  description: "Visual 14/30-day room rack and reservation assignment board.",
  shortcutKey: "1",
};

const KEYBOARD_TAB_MAP: Readonly<Record<string, FrontDeskTabId>> = {
  "1": "TAPE_CHART",
  "2": "DAILY_BOARD",
  "3": "DRIVER_QUARTERS",
  "4": "MEAL_FORECAST",
  "5": "POLICE_REGISTER",
  "6": "DMC_CONTRACTS",
};

// ============================================================================
// Sample Fallback Data for Front-Desk Showcase
// ============================================================================

const DEFAULT_DAILY_ENTRIES: readonly DailyGuestEntry[] = [
  {
    reservationId: "res-arr-101",
    bookingReference: "GAL-2026-101",
    guestName: "Alice Walker",
    nationality: "British",
    identityType: "PASSPORT",
    identityNumber: "P99887766",
    identityVerified: true,
    vipStatus: "VIP",
    vipNotes: "High floor requested, welcome King Coconut basket",
    roomNumber: "101",
    roomTypeName: "Deluxe Ocean Villa",
    roomStatus: "INSPECTED",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-24",
    numberOfNights: 5,
    numberOfGuests: 2,
    mealPlan: "HB",
    airportTransfer: "DRIVER_ASSIGNED",
    flightNumber: "UL 504",
    transferEta: "14:30",
    folioBalanceLkr: 45000,
    folioBalanceUsd: 150,
    checkedIn: false,
    checkedOut: false,
    chauffeurAccompanied: true,
  },
  {
    reservationId: "res-inh-202",
    bookingReference: "GAL-2026-202",
    guestName: "Sunil Bandara",
    nationality: "Sri Lankan",
    identityType: "NIC",
    identityNumber: "198512345678",
    identityVerified: true,
    vipStatus: "STANDARD",
    roomNumber: "202",
    roomTypeName: "Superior Garden Room",
    roomStatus: "CLEAN",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-21",
    numberOfNights: 3,
    numberOfGuests: 2,
    mealPlan: "BB",
    airportTransfer: "NOT_REQUESTED",
    folioBalanceLkr: 0,
    checkedIn: true,
    checkedOut: false,
  },
  {
    reservationId: "res-dep-304",
    bookingReference: "GAL-2026-304",
    guestName: "Nimali Perera",
    nationality: "Sri Lankan",
    identityType: "NIC",
    identityNumber: "199087654321",
    identityVerified: true,
    vipStatus: "STANDARD",
    roomNumber: "304",
    roomTypeName: "Executive Suite",
    roomStatus: "INSPECTED",
    checkInDate: "2026-10-16",
    checkOutDate: "2026-10-19",
    numberOfNights: 3,
    numberOfGuests: 2,
    mealPlan: "FB",
    airportTransfer: "COMPLETED",
    folioBalanceLkr: 18500,
    checkedIn: true,
    checkedOut: false,
  },
];

// ============================================================================
// Subcomponents (Clean Version 2 Layout)
// ============================================================================

interface FrontDeskHeaderProps {
  readonly hotelName: string;
  readonly activeTabInfo: FrontDeskTab;
  readonly onOpenNewBooking: () => void;
  readonly onOpenFindGuest: () => void;
  readonly disabled?: boolean | undefined;
}

function FrontDeskHeader({
  hotelName,
  activeTabInfo,
  onOpenNewBooking,
  onOpenFindGuest,
  disabled = false,
}: FrontDeskHeaderProps): React.JSX.Element {
  return (
    <AdminPageHeader
      title={`Front Desk & ${activeTabInfo.label}`}
      subtitle={`Front-Desk Command Center • ${activeTabInfo.description}`}
      propertyTitle={hotelName}
      statusBadge={{ label: "Live Room Rack", variant: "success", pulse: true }}
      actions={
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenFindGuest}
            disabled={disabled}
            title="Search Guest CRM (Press F)"
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
          >
            <SearchSvgIcon size={14} />
            <span>Find Guest (Walk-In Check-In)</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewBooking}
            disabled={disabled}
            title="Create New Reservation / Walk-In (Press N)"
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>+ New Booking / Reservation</span>
          </button>
        </div>
      }
    />
  );
}

interface FrontDeskMetricsStripProps {
  readonly dailyEntries: readonly DailyGuestEntry[];
}

function computeFrontDeskSummary(dailyEntries: readonly DailyGuestEntry[]) {
  const arr = dailyEntries.filter((e) => e.checkInDate === "2026-10-19" && !e.checkedIn).length;
  const dep = dailyEntries.filter((e) => e.checkOutDate === "2026-10-19").length;
  const inh = dailyEntries.filter((e) => e.checkedIn && !e.checkedOut).length;
  return {
    arrivalsCount: arr || 4,
    departuresCount: dep || 3,
    inHouseCount: inh || 24,
  };
}

function FrontDeskMetricsStrip({ dailyEntries }: FrontDeskMetricsStripProps): React.JSX.Element {
  const { arrivalsCount, departuresCount, inHouseCount } = useMemo(
    () => computeFrontDeskSummary(dailyEntries),
    [dailyEntries],
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <AdminKpiCard
        title="Arrivals Today"
        value={arrivalsCount}
        subtitle="3 Ready to Check In"
        size="sm"
        badge={{ text: "Arrivals", variant: "neutral" }}
      />

      <AdminKpiCard
        title="Departures Today"
        value={departuresCount}
        subtitle="11:00 AM Checkout"
        size="sm"
        badge={{ text: "Departures", variant: "neutral" }}
      />

      <AdminKpiCard
        title="In-House Stays"
        value={inHouseCount}
        subtitle="86% Occupancy"
        size="sm"
        badge={{ text: "In-House", variant: "success" }}
      />

      <AdminKpiCard
        title="Driver Dorm Beds"
        value="8 / 12"
        subtitle="DMC Chauffeurs"
        size="sm"
        badge={{ text: "Quarters", variant: "info" }}
      />

      <AdminKpiCard
        title="Breakfast Buffet"
        value="48 Pax"
        subtitle="BB / HB / FB"
        size="sm"
        badge={{ text: "Dining", variant: "warning" }}
      />

      <AdminKpiCard
        title="Police B-Cards"
        value="100% OK"
        subtitle="Passports Verified"
        size="sm"
        badge={{ text: "Verified", variant: "success" }}
      />
    </div>
  );
}

interface FrontDeskActiveTabContentProps {
  readonly activeTab: FrontDeskTabId;
  readonly hotelName: string;
  readonly rooms?: readonly TapeChartRoom[] | undefined;
  readonly reservations?: readonly TapeChartReservation[] | undefined;
  readonly dailyEntries: readonly DailyGuestEntry[];
  readonly driverEntries?: readonly DriverQuartersEntry[] | undefined;
  readonly mealReservations?: readonly ForecastReservation[] | undefined;
  readonly policeEntries?: readonly PoliceBCardEntry[] | undefined;
  readonly dmcContracts?: readonly DmcContract[] | undefined;
  readonly onOpenCancelDialog: (entry: DailyGuestEntry) => void;
  readonly onOpenModifyDialog: (entry: DailyGuestEntry) => void;
  readonly onOpenRegCardDialog: (entry: DailyGuestEntry) => void;
  readonly onActionNotify?: ((title: string, message: string) => void) | undefined;
  readonly disabled?: boolean | undefined;
}

function FrontDeskActiveTabContent({
  activeTab,
  hotelName,
  rooms,
  reservations,
  dailyEntries,
  driverEntries,
  mealReservations,
  policeEntries,
  dmcContracts,
  onOpenCancelDialog,
  onOpenModifyDialog,
  onOpenRegCardDialog,
  onActionNotify,
  disabled,
}: FrontDeskActiveTabContentProps): React.JSX.Element {
  switch (activeTab) {
    case "TAPE_CHART":
      return (
        <TapeChartGrid
          rooms={rooms}
          reservations={reservations}
          propertyTitle={hotelName}
          onSelectReservation={(res) => {
            onActionNotify?.(
              "Reservation Selected",
              `Reservation ${res.confirmationCode} selected.`,
            );
          }}
          onSelectEmptySlot={(roomId, date) => {
            onActionNotify?.("Empty Slot Clicked", `Assign room ${roomId} on date ${date}`);
          }}
        />
      );

    case "DAILY_BOARD":
      return (
        <FrontDeskDailyBoard
          hotelName={hotelName}
          entries={dailyEntries}
          disabled={disabled}
          onCheckInClick={(entry) => {
            onOpenRegCardDialog(entry);
          }}
          onCheckOutClick={(entry) => {
            onActionNotify?.("Check-Out Initiated", `Checking out guest ${entry.guestName}`);
          }}
          onModifyStayClick={(entry) => {
            onOpenModifyDialog(entry);
          }}
          onViewFolioClick={(entry) => {
            onOpenCancelDialog(entry);
          }}
        />
      );

    case "DRIVER_QUARTERS":
      return (
        <DriverQuartersBoard
          hotelName={hotelName}
          entries={driverEntries}
          disabled={disabled}
          onSendSms={(payload) => {
            onActionNotify?.("SMS Dispatched", `Notification sent to driver ${payload.phone}`);
          }}
          onIssueGatePass={(driverId) => {
            onActionNotify?.("Gate Pass Issued", `Gate pass generated for driver ${driverId}`);
          }}
        />
      );

    case "MEAL_FORECAST":
      return (
        <MealPlanForecastCard
          hotelName={hotelName}
          reservations={mealReservations}
          restaurantCapacity={120}
          disabled={disabled}
          onPrintForecast={() => {
            onActionNotify?.("Print Forecast", "Printing kitchen meal plan forecast sheet");
          }}
        />
      );

    case "POLICE_REGISTER":
      return (
        <PoliceBCardRegister
          hotelName={hotelName}
          entries={policeEntries}
          disabled={disabled}
          onExportCsv={() => {
            onActionNotify?.(
              "Exported B-Card CSV",
              "Police Foreign Register CSV ready for inspection.",
            );
          }}
        />
      );

    case "DMC_CONTRACTS":
      return (
        <DmcContractManager
          initialContracts={dmcContracts}
          readOnly={disabled}
          onSaveContract={() => {
            onActionNotify?.("Contract Saved", "DMC wholesale contract updated.");
          }}
        />
      );

    default:
      return (
        <div className="p-8 text-center text-sm text-slate-500">Tab content not available.</div>
      );
  }
}

function isInputElementActive(): boolean {
  const active = document.activeElement;
  if (!active) {
    return false;
  }
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function executeShortcutAction(
  key: string,
  onNewBooking: () => void,
  onFindGuest: () => void,
  onCloseModals: () => void,
): boolean {
  if (key === "escape") {
    onCloseModals();
    return true;
  }
  if (key === "n") {
    onNewBooking();
    return true;
  }
  if (key === "f") {
    onFindGuest();
    return true;
  }
  return false;
}

// ============================================================================
// Main Master Component
// ============================================================================

export function FrontDeskPage({
  hotelName = "Galle Fort Lighthouse Villa",
  initialTab = "TAPE_CHART",
  rooms,
  reservations,
  dailyEntries = DEFAULT_DAILY_ENTRIES,
  driverEntries,
  mealReservations,
  policeEntries,
  dmcContracts,
  crmGuests,
  onTabChange,
  onActionNotify,
  disabled = false,
  className = "",
}: FrontDeskPageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<FrontDeskTabId>(initialTab);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [isFindGuestOpen, setIsFindGuestOpen] = useState<boolean>(false);

  // Subdialog states
  const [cancelReservation, setCancelReservation] = useState<CancelReservationReservation | null>(
    null,
  );
  const [modifyStayGuest, setModifyStayGuest] = useState<DailyGuestEntry | null>(null);
  const [regCardStay, setRegCardStay] = useState<Partial<PrintableRegCardData> | null>(null);

  const activeTabInfo = useMemo(() => {
    return FRONT_DESK_TABS.find((t) => t.id === activeTab) ?? DEFAULT_FRONT_DESK_TAB;
  }, [activeTab]);

  const handleTabSelect = useCallback(
    (tabId: FrontDeskTabId) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  const closeAllModals = useCallback(() => {
    setIsNewBookingOpen(false);
    setIsFindGuestOpen(false);
    setCancelReservation(null);
    setModifyStayGuest(null);
    setRegCardStay(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElementActive()) {
        return;
      }

      const lowerKey = e.key.toLowerCase();
      const actionHandled = executeShortcutAction(
        lowerKey,
        () => setIsNewBookingOpen(true),
        () => setIsFindGuestOpen(true),
        closeAllModals,
      );

      if (actionHandled) {
        e.preventDefault();
        return;
      }

      const targetTab = KEYBOARD_TAB_MAP[e.key];
      if (targetTab) {
        e.preventDefault();
        handleTabSelect(targetTab);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAllModals, handleTabSelect]);

  const handleOpenCancelDialog = (entry: DailyGuestEntry) => {
    setCancelReservation({
      reservationId: entry.reservationId,
      bookingReference: entry.bookingReference,
      guestName: entry.guestName,
      roomNumber: entry.roomNumber,
      roomTypeName: entry.roomTypeName,
      checkInDate: entry.checkInDate,
      checkOutDate: entry.checkOutDate,
      nightCount: entry.numberOfNights,
      ratePerNightLkr: 25000,
      totalBookingLkr: 25000 * entry.numberOfNights,
      depositPaidLkr: 25000,
      driverBedAllocated: Boolean(entry.chauffeurAccompanied),
      driverBedNumber: "D-05",
    });
  };

  const handleOpenModifyDialog = (entry: DailyGuestEntry) => {
    setModifyStayGuest(entry);
  };

  const handleOpenRegCardDialog = (entry: DailyGuestEntry) => {
    setRegCardStay({
      bookingReference: entry.bookingReference,
      guestName: entry.guestName,
      phone: "+94771234567",
      roomNumber: entry.roomNumber,
      roomCategory: entry.roomTypeName,
      checkInDate: entry.checkInDate,
      checkOutDate: entry.checkOutDate,
      mealPlan: entry.mealPlan,
      paxAdults: entry.numberOfGuests,
      wifiSsid: "Galle_Fort_Villa_Guest",
      wifiPassword: "LotusBloom2026",
      folioPin: "5821",
      hotelName,
      sltdaLicenseNo: "SLTDA/HOT/2026/0042",
      hotelPhone: "+94 91 224 8900",
    });
  };

  return (
    <div className={`space-y-5 font-sf-pro ${className}`}>
      {/* Master Front-Desk Header */}
      <FrontDeskHeader
        hotelName={hotelName}
        activeTabInfo={activeTabInfo}
        onOpenNewBooking={() => setIsNewBookingOpen(true)}
        onOpenFindGuest={() => setIsFindGuestOpen(true)}
        disabled={disabled}
      />

      {/* Segmented Control Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 flex-wrap">
        <SegmentedControl
          options={FRONT_DESK_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          ariaLabel="Front-desk workspaces"
        />
      </div>

      {/* Quick Metrics KPI Strip */}
      <FrontDeskMetricsStrip dailyEntries={dailyEntries} />

      {/* Active Tab Workspace View */}
      <main className="min-h-[480px]">
        <FrontDeskActiveTabContent
          activeTab={activeTab}
          hotelName={hotelName}
          rooms={rooms}
          reservations={reservations}
          dailyEntries={dailyEntries}
          driverEntries={driverEntries}
          mealReservations={mealReservations}
          policeEntries={policeEntries}
          dmcContracts={dmcContracts}
          onOpenCancelDialog={handleOpenCancelDialog}
          onOpenModifyDialog={handleOpenModifyDialog}
          onOpenRegCardDialog={handleOpenRegCardDialog}
          onActionNotify={onActionNotify}
          disabled={disabled}
        />
      </main>

      {/* New Reservation Modal (N) */}
      <ReservationModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onSave={(_res: ReservationFormData) => {
          setIsNewBookingOpen(false);
          onActionNotify?.("Booking Created", "New reservation recorded successfully.");
        }}
      />

      {/* Guest CRM Drawer (F) */}
      <GuestCrmDrawer
        isOpen={isFindGuestOpen}
        onClose={() => setIsFindGuestOpen(false)}
        guests={crmGuests}
        onSelectGuest={(guest) => {
          setIsFindGuestOpen(false);
          onActionNotify?.("Guest Selected", `Loaded profile for ${guest.fullName}`);
        }}
      />

      {/* Cancellation / Retention Charge Dialog */}
      {cancelReservation && (
        <CancelReservationDialog
          isOpen={Boolean(cancelReservation)}
          onClose={() => setCancelReservation(null)}
          reservation={cancelReservation}
          onConfirmCancellation={(_payload: CancelReservationPayload) => {
            setCancelReservation(null);
            onActionNotify?.("Reservation Cancelled", "Room inventory released successfully.");
          }}
        />
      )}

      {/* Modify Stay / Room Move Dialog */}
      {modifyStayGuest && (
        <ModifyStayDialog
          isOpen={Boolean(modifyStayGuest)}
          onClose={() => setModifyStayGuest(null)}
          stay={{
            reservationId: modifyStayGuest.reservationId,
            bookingReference: modifyStayGuest.bookingReference,
            guestName: modifyStayGuest.guestName,
            currentRoomNumber: modifyStayGuest.roomNumber,
            currentRoomTypeName: modifyStayGuest.roomTypeName,
            currentRateLkr: 25000,
            checkInDate: modifyStayGuest.checkInDate,
            checkOutDate: modifyStayGuest.checkOutDate,
            remainingNights: modifyStayGuest.numberOfNights,
            totalFolioLkr: modifyStayGuest.folioBalanceLkr,
            tenantId: "tenant-default",
          }}
          availableRooms={[
            {
              roomNumber: "205",
              roomTypeName: "Deluxe Ocean Villa",
              rateLkr: 35000,
              status: "INSPECTED",
            },
          ]}
          onConfirmModify={(_payload: ModifyStayPayload) => {
            setModifyStayGuest(null);
            onActionNotify?.("Stay Modified", "Room move / stay extension recorded.");
          }}
        />
      )}

      {/* Printable A4 Reg Card & Welcome Slip */}
      {regCardStay && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white w-full h-full max-w-none max-h-none border-none overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 ">
              <span className="text-sm font-bold">Printable Reg Card &amp; Welcome Slip</span>
              <button
                type="button"
                onClick={() => setRegCardStay(null)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 "
              >
                Close
              </button>
            </div>
            <PrintableRegCard data={regCardStay} onClose={() => setRegCardStay(null)} />
          </div>
        </dialog>
      )}
    </div>
  );
}
