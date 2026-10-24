/**
 * Master Housekeeping & Engineering Admin Page (HousekeepingAdminPage.tsx)
 *
 * Unified executive housekeeping, facilities engineering, and sustainability management hub:
 * - Tabbed workspace coordinating:
 * 1. Room Status Matrix & Daily Attendant Assignments (HkAssignmentBoard)
 * 2. Printable Daily Floor Sheet & Trolley Clipboard (PrintableHkFloorSheet)
 * 3. Guest & Hotel Linen Laundry Wash Pipeline (LaundryTrackerView)
 * 4. Linen & Towel Par-Stock Inventory (LinenInventoryCard)
 * 5. Engineering & Preventive Maintenance Tickets (MaintenanceTicketBoard)
 * 6. Lost & Found Register & Custody Tracker (LostAndFoundView)
 * 7. Diesel Generator, CEB Power & Water Tank Utility Logs (UtilityMeterCard)
 * 8. Room Deep-Cleaning & Monsoon Mold / Fumigation Schedule (DeepCleanSchedule)
 * 9. Amenity Eco-Refills & Single-Use Plastic Avoidance (AmenityUsageCard)
 * 10. Attendant Turnaround Productivity & Bonus Report (HkProductivityCard)
 * - Persistent Discrepancy Alert Banner (DiscrepancyAlertBar)
 * - Executive overview KPI ribbon (.tabular-nums-lkr, live turnaround metrics)
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: .apple-liquid-glass, SF Pro typography, >=44x44pt targets
 * - Strictly zero console noise, cognitive complexity <= 12
 */

import { type FC, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import { AmenityUsageCard } from "./AmenityUsageCard.js";
import { DeepCleanSchedule } from "./DeepCleanSchedule.js";
import {
  DEFAULT_DISCREPANCY_ALERTS,
  DiscrepancyAlertBar,
  type DiscrepancyAlertItem,
} from "./DiscrepancyAlertBar.js";
import { HkAssignmentBoard } from "./HkAssignmentBoard.js";
import { HkProductivityCard } from "./HkProductivityCard.js";
import { LaundryTrackerView } from "./LaundryTrackerView.js";
import { LinenInventoryCard } from "./LinenInventoryCard.js";
import { LostAndFoundView } from "./LostAndFoundView.js";
import { MaintenanceTicketBoard } from "./MaintenanceTicketBoard.js";
import { PrintableHkFloorSheet } from "./PrintableHkFloorSheet.js";
import { UtilityMeterCard } from "./UtilityMeterCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HousekeepingTabId =
  | "ASSIGNMENTS"
  | "FLOOR_SHEET"
  | "LAUNDRY"
  | "LINEN"
  | "MAINTENANCE"
  | "LOST_FOUND"
  | "UTILITIES"
  | "DEEP_CLEAN"
  | "AMENITIES"
  | "PRODUCTIVITY";

export interface HousekeepingTab {
  readonly id: HousekeepingTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly icon: string;
  readonly badge?: string | undefined;
}

export interface HousekeepingOverviewMetrics {
  readonly totalRooms: number;
  readonly cleanRooms: number;
  readonly dirtyRooms: number;
  readonly inProgressRooms: number;
  readonly openMaintenanceCount: number;
  readonly urgentMaintenanceCount: number;
  readonly activeLaundryJobs: number;
  readonly activeDiscrepancies: number;
  readonly generatorHoursToday: number;
}

export interface HousekeepingAdminPageProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly initialTab?: HousekeepingTabId | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly discrepancyAlerts?: readonly DiscrepancyAlertItem[] | undefined;
  readonly onTabChange?: ((tab: HousekeepingTabId) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Tab Definitions & Constants
// ============================================================================

export const HOUSEKEEPING_TABS: readonly HousekeepingTab[] = [
  {
    id: "ASSIGNMENTS",
    label: "Room Matrix & Task Assignments",
    shortLabel: "Assignments",
    description: "Daily attendant task sheets, workload balancing, and turnaround credits.",
    icon: "List",
  },
  {
    id: "FLOOR_SHEET",
    label: "Printable Trolley Floor Sheet",
    shortLabel: "Floor Sheet",
    description: "SLTDA-compliant physical clipboard trolley backup for floor attendants.",
    icon: "Print",
    badge: "Print",
  },
  {
    id: "LAUNDRY",
    label: "Guest & House Laundry",
    shortLabel: "Laundry",
    description: "Wash & press pipeline with express surcharges and folio auto-posting.",
    icon: "Laundry",
  },
  {
    id: "LINEN",
    label: "Linen & Towel Inventory",
    shortLabel: "Linen Par",
    description: "Central linen room par stocks, circulation health, and discard logs.",
    icon: "Room",
  },
  {
    id: "MAINTENANCE",
    label: "Engineering & Work Orders",
    shortLabel: "Maintenance",
    description: "HVAC, plumbing, electrical, and preventive maintenance work orders.",
    icon: "Fix",
  },
  {
    id: "LOST_FOUND",
    label: "Lost & Found Register",
    shortLabel: "Lost & Found",
    description: "Custody vault register linked to guest NIC/passport and WhatsApp SMS.",
    icon: "Box",
    badge: "Statutory",
  },
  {
    id: "UTILITIES",
    label: "Power & Water Utilities",
    shortLabel: "Utilities",
    description: "CEB grid electricity, diesel generator runtime, and water tank logs.",
    icon: "Fast",
  },
  {
    id: "DEEP_CLEAN",
    label: "Deep Clean & Fumigation",
    shortLabel: "Deep Clean",
    description: "Monsoon mold prevention, teak balcony care, and pest control schedules.",
    icon: "Clean",
  },
  {
    id: "AMENITIES",
    label: "Ayurvedic Amenities & Eco",
    shortLabel: "Eco Amenities",
    description: "Ceramic dispenser bulk refills, GIN vouchers, and plastic bottle counter.",
    icon: "Eco",
  },
  {
    id: "PRODUCTIVITY",
    label: "Turnaround Productivity",
    shortLabel: "Productivity",
    description: "Attendant turnaround times, supervisor scores, and monthly bonus pool.",
    icon: "Timer",
  },
];

export const HOUSEKEEPING_SEGMENTED_OPTIONS: readonly SegmentedControlOption<HousekeepingTabId>[] =
  HOUSEKEEPING_TABS.map((t) => ({
    id: t.id,
    label: t.shortLabel,

    badge: t.badge,
  }));

export const DEFAULT_OVERVIEW_METRICS: HousekeepingOverviewMetrics = {
  totalRooms: 48,
  cleanRooms: 31,
  dirtyRooms: 12,
  inProgressRooms: 5,
  openMaintenanceCount: 4,
  urgentMaintenanceCount: 1,
  activeLaundryJobs: 6,
  activeDiscrepancies: 3,
  generatorHoursToday: 2.4,
};

// ============================================================================
// Translations
// ============================================================================

export interface HkAdminTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly totalRooms: string;
  readonly cleanRatio: string;
  readonly dirtyAttention: string;
  readonly openTickets: string;
  readonly activeLaundry: string;
  readonly generatorRun: string;
  readonly quickPrint: string;
  readonly filterTabs: string;
  readonly defaultHotel: string;
}

const TRANSLATIONS: Record<SupportedLanguage, HkAdminTranslations> = {
  en: {
    title: "Housekeeping & Facilities Engineering",
    subtitle: "Turnaround Operations, Linen Logistics, Engineering & Utility Management",
    totalRooms: "Total Inventory",
    cleanRatio: "Inspected & Clean",
    dirtyAttention: "Dirty / Turnover",
    openTickets: "Maintenance Tickets",
    activeLaundry: "Active Laundry",
    generatorRun: "Generator Today",
    quickPrint: "Print Floor Sheet",
    filterTabs: "Operations Navigation",
    defaultHotel: "Galle Face Heritage Hotel & Spa - Colombo",
  },
  si: {
    title: "කාමර පිරිසිදු කිරීම සහ ඉංජිනේරු අංශය",
    subtitle: "කාමර සූදානම් කිරීම, රෙදිපිළි පාලනය, නඩත්තු හා උපයෝගිතා මෙහෙයුම්",
    totalRooms: "මුළු කාමර",
    cleanRatio: "පිරිසිදු කළ කාමර",
    dirtyAttention: "පිරිසිදු කළ යුතු",
    openTickets: "නඩත්තු ඉල්ලීම්",
    activeLaundry: "රෙදි සේදීමේ කාර්යයන්",
    generatorRun: "ජනක යන්ත්රය අද",
    quickPrint: "ලේඛනය මුද්රණය",
    filterTabs: "මෙහෙයුම් මෙනුව",
    defaultHotel: "ගාලු මුවදොර උරුම හෝටලය - කොළඹ",
  },
  ta: {
    title: "தூய்மைப்பணி & பொறியியல் நிர்வாகம்",
    subtitle: "அறை தயாரிப்பு, துணி பராமரிப்பு, பராமரிப்பு மற்றும் பயன்பாட்டு மேலாண்மை",
    totalRooms: "மொத்த அறைகள்",
    cleanRatio: "சுத்தம் செய்யப்பட்டவை",
    dirtyAttention: "கவனம் தேவை",
    openTickets: "பராமரிப்பு கோரிக்கைகள்",
    activeLaundry: "துணி துவைப்பு பணிகள்",
    generatorRun: "ஜெனரேட்டர் இயக்கம்",
    quickPrint: "தாளை அச்சிடுக",
    filterTabs: "செயல்பாடுகள் வழிசெலுத்தல்",
    defaultHotel: "காலி பேஸ் ஹெரிட்டேஜ் ஹோட்டல் - கொழும்பு",
  },
};

// ============================================================================
// Pure Helpers
// ============================================================================

export function getHkAdminPageText(lang: SupportedLanguage = "en"): HkAdminTranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

export function calculateHkOverviewMetrics(
  overrides?: Partial<HousekeepingOverviewMetrics>,
): HousekeepingOverviewMetrics {
  return {
    ...DEFAULT_OVERVIEW_METRICS,
    ...overrides,
  };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface HkPageHeaderProps {
  readonly propertyTitle: string;
  readonly text: HkAdminTranslations;
  readonly activeTab: HousekeepingTabId;
  readonly onPrintClick: () => void;
}

function HkPageHeader({ propertyTitle, text, activeTab, onPrintClick }: HkPageHeaderProps) {
  const currentTabDef = useMemo(
    () => HOUSEKEEPING_TABS.find((t) => t.id === activeTab) ?? HOUSEKEEPING_TABS[0],
    [activeTab],
  );

  return (
    <AdminPageHeader
      title={text.title}
      subtitle={`${text.subtitle} • Current: ${currentTabDef?.label}`}
      propertyTitle={propertyTitle}
      actions={
        <button
          type="button"
          onClick={onPrintClick}
          className="admin-btn-primary min-h-[38px] text-xs"
        >
          <span>{text.quickPrint}</span>
        </button>
      }
    />
  );
}

interface HkOverviewStatsProps {
  readonly metrics: HousekeepingOverviewMetrics;
  readonly text: HkAdminTranslations;
  readonly onSelectTab: (tabId: HousekeepingTabId) => void;
}

function HkOverviewStatsRibbon({ metrics, text, onSelectTab }: HkOverviewStatsProps) {
  const cleanPct = Math.round((metrics.cleanRooms / metrics.totalRooms) * 100);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Clean & Ready */}
      <AdminKpiCard
        title={text.cleanRatio}
        size="sm"
        value={
          <div className="flex items-baseline gap-1.5">
            <span>{metrics.cleanRooms}</span>
            <span className="text-xs text-slate-400 font-normal">/{metrics.totalRooms}</span>
          </div>
        }
        badge={{ text: `${cleanPct}%`, variant: "success" }}
        subtitle="Inspected and guest ready"
        onClick={() => onSelectTab("ASSIGNMENTS")}
      />

      {/* 2. Dirty Turnover */}
      <AdminKpiCard
        title={text.dirtyAttention}
        size="sm"
        value={metrics.dirtyRooms}
        badge={{ text: `${metrics.inProgressRooms} in progress`, variant: "danger" }}
        subtitle="Checkout and stayover dirty"
        onClick={() => onSelectTab("ASSIGNMENTS")}
      />

      {/* 3. Open Maintenance Tickets */}
      <AdminKpiCard
        title={text.openTickets}
        size="sm"
        value={metrics.openMaintenanceCount}
        badge={
          metrics.urgentMaintenanceCount > 0
            ? { text: `${metrics.urgentMaintenanceCount} Urgent`, variant: "danger" }
            : { text: "Routine", variant: "warning" }
        }
        subtitle="HVAC, plumbing, electrical"
        onClick={() => onSelectTab("MAINTENANCE")}
      />

      {/* 4. Active Laundry Jobs */}
      <AdminKpiCard
        title={text.activeLaundry}
        size="sm"
        value={metrics.activeLaundryJobs}
        badge={{ text: "In Wash", variant: "info" }}
        subtitle="Batches in wash & press"
        onClick={() => onSelectTab("LAUNDRY")}
      />

      {/* 5. Generator Hours */}
      <AdminKpiCard
        title={text.generatorRun}
        size="sm"
        value={`${metrics.generatorHoursToday}h`}
        badge={{ text: "CEB Grid Normal", variant: "neutral" }}
        subtitle="Diesel generator runtime"
        onClick={() => onSelectTab("UTILITIES")}
      />
    </div>
  );
}

interface HkTabContentProps {
  readonly activeTab: HousekeepingTabId;
  readonly tenantId?: string | undefined;
  readonly propertyTitle: string;
  readonly language: SupportedLanguage;
}

function HkTabContent({ activeTab, tenantId, propertyTitle, language }: HkTabContentProps) {
  switch (activeTab) {
    case "ASSIGNMENTS":
      return (
        <HkAssignmentBoard tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
    case "FLOOR_SHEET":
      return (
        <PrintableHkFloorSheet
          tenantId={tenantId}
          metadata={{ propertyTitle }}
          language={language}
        />
      );
    case "LAUNDRY":
      return (
        <LaundryTrackerView tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
    case "LINEN":
      return (
        <LinenInventoryCard tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
    case "MAINTENANCE":
      return (
        <MaintenanceTicketBoard
          tenantId={tenantId}
          propertyName={propertyTitle}
          language={language}
        />
      );
    case "LOST_FOUND":
      return (
        <LostAndFoundView tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
    case "UTILITIES":
      return (
        <UtilityMeterCard tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
    case "DEEP_CLEAN":
      return (
        <DeepCleanSchedule tenantId={tenantId} propertyTitle={propertyTitle} language={language} />
      );
    case "AMENITIES":
      return (
        <AmenityUsageCard tenantId={tenantId} propertyTitle={propertyTitle} language={language} />
      );
    case "PRODUCTIVITY":
      return (
        <HkProductivityCard tenantId={tenantId} propertyTitle={propertyTitle} language={language} />
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

export const HousekeepingAdminPage: FC<HousekeepingAdminPageProps> = ({
  tenantId,
  propertyTitle: customTitle,
  initialTab = "ASSIGNMENTS",
  language = "en",
  discrepancyAlerts,
  onTabChange,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<HousekeepingTabId>(initialTab);
  const text = useMemo(() => getHkAdminPageText(language), [language]);
  const propertyTitle = customTitle ?? text.defaultHotel;

  const alerts = discrepancyAlerts ?? DEFAULT_DISCREPANCY_ALERTS;
  const metrics = useMemo(() => calculateHkOverviewMetrics(), []);

  const handleTabChange = (tabId: HousekeepingTabId) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleQuickPrint = () => {
    handleTabChange("FLOOR_SHEET");
  };

  return (
    <div className={`housekeeping-admin-page font-sf-pro text-slate-900 space-y-6 ${className}`}>
      {/* 1. Header with title & Print Quick Action */}
      <HkPageHeader
        propertyTitle={propertyTitle}
        text={text}
        activeTab={activeTab}
        onPrintClick={handleQuickPrint}
      />

      {/* 2. Persistent Discrepancy Alerts (Sleep-Out, Skip-Out, Key Conflicts) */}
      <DiscrepancyAlertBar
        tenantId={tenantId}
        propertyTitle={propertyTitle}
        language={language}
        initialDiscrepancies={alerts}
      />

      {/* 3. Executive KPI Stats Ribbon */}
      <HkOverviewStatsRibbon metrics={metrics} text={text} onSelectTab={handleTabChange} />

      {/* 4. Tab Navigation with SegmentedControl */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl<HousekeepingTabId>
          options={HOUSEKEEPING_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabChange}
          size="md"
          fullWidth
          ariaLabel={text.filterTabs}
          className="min-w-[800px] shadow-sm"
        />
      </div>

      {/* 5. Active Tab Workspace */}
      <main className="transition-all duration-300">
        <HkTabContent
          activeTab={activeTab}
          tenantId={tenantId}
          propertyTitle={propertyTitle}
          language={language}
        />
      </main>
    </div>
  );
};
