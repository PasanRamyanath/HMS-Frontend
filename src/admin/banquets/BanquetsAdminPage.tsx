/**
 * Unified Banquets, Weddings & MICE Admin Page (BanquetsAdminPage.tsx)
 *
 * Implements Step 348 (Phase 14.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive executive command center for Sri Lankan banquet, wedding, and conference operations:
 * - Tabbed workspace coordinating:
 * 1. Banquet & Wedding Availability Calendar (BanquetCalendar)
 * 2. Printable A4 Banquet Event Order Prospectus (PrintableBeoSheet)
 * 3. Sri Lankan Wedding Menu Package Customizer & Plate Quotas (BanquetMenuSelector)
 * 4. Tentative Hold Expiry Alert & Sales Follow-Up Queue (BanquetLeadQueue)
 * 5. Banquet Hall Floor Plan & Table Numbering Designer (BanquetTableLayout)
 * 6. Banquet Profitability & Food Cost Margin Summary (BanquetProfitCard)
 * 7. Casual Banquet Steward Attendance & Cash Payout Sheet (CasualStewardSheet)
 * 8. Banquet Hall & Lawn Master Configurator (BanquetHallSetup)
 * - Executive action triggers:
 * - New Function Booking Wizard Modal (BanquetBookingModal)
 * - Final Tax Invoice & Deposit Deduction Settlement (BanquetSettlementModal)
 * - Client Liquor Bottle Gate-Pass & Empty-Bottle Log (LiquorBottleLogModal)
 * - Spotlight ⌘K Command Bar & Quick Actions
 * - Executive Overview KPI Ribbon (.tabular-nums-lkr, pipeline value, hold alerts)
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: .apple-liquid-glass, SF Pro optical hierarchy, >=44x44pt touch targets
 * - Strictly zero console noise, cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import { BanquetBarAndBitesForm } from "./BanquetBarAndBitesForm.js";
import { type BanquetBookingFormData, BanquetBookingModal } from "./BanquetBookingModal.js";
import { BanquetCalendar } from "./BanquetCalendar.js";
import { BanquetHallSetup } from "./BanquetHallSetup.js";
import { BanquetLeadQueue } from "./BanquetLeadQueue.js";
import { BanquetMenuSelector } from "./BanquetMenuSelector.js";
import { BanquetProfitCard } from "./BanquetProfitCard.js";
import { BanquetSettlementModal } from "./BanquetSettlementModal.js";
import { BanquetTableLayout } from "./BanquetTableLayout.js";
import { CasualStewardSheet } from "./CasualStewardSheet.js";
import { LiquorBottleLogModal } from "./LiquorBottleLogModal.js";
import { PrintableBeoSheet } from "./PrintableBeoSheet.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BanquetAdminTabId =
  | "CALENDAR"
  | "BEO"
  | "MENU"
  | "LEADS"
  | "TABLES"
  | "PROFIT"
  | "STEWARDS"
  | "HALLS";

export interface BanquetAdminTab {
  readonly id: BanquetAdminTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly icon: string;
  readonly badge?: string | undefined;
}

export interface BanquetOverviewMetrics {
  readonly totalBookingsThisMonth: number;
  readonly confirmedWeddings: number;
  readonly tentativeHolds: number;
  readonly expiringHoldsAlert: number;
  readonly totalRevenueLkr: number;
  readonly averageFoodCostMarginPct: number;
  readonly casualLaborPayoutTodayLkr: number;
}

export interface BanquetsAdminPageProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly initialTab?: BanquetAdminTabId | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly overviewMetrics?: Partial<BanquetOverviewMetrics> | undefined;
  readonly onTabChange?: ((tab: BanquetAdminTabId) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Tab Definitions & Constants
// ============================================================================

export const BANQUET_ADMIN_TABS: readonly BanquetAdminTab[] = [
  {
    id: "CALENDAR",
    label: "Availability & Auspicious Calendar",
    shortLabel: "Calendar",
    description: "Morning Poruwa & Evening Homecoming slots, Nekath dates, and Poya dry days.",
    icon: "Date",
  },
  {
    id: "BEO",
    label: "Banquet Event Order (BEO)",
    shortLabel: "BEO Prospectus",
    description: "Master operations blueprint, department directives, and printable A4 sign-offs.",
    icon: "Scroll",
    badge: "Print",
  },
  {
    id: "MENU",
    label: "Menu Packages & Live Stations",
    shortLabel: "Menu & Food",
    description: "Wedding buffet quotas, hopper bars, BBQ wok stations, and plate rates.",
    icon: "Dining",
  },
  {
    id: "LEADS",
    label: "Sales Leads & Tentative Holds",
    shortLabel: "Leads & Holds",
    description:
      "7-day hold expiry countdowns, 48h critical alerts, and 1-click WhatsApp follow-ups.",
    icon: "Wait",
    badge: "Critical",
  },
  {
    id: "TABLES",
    label: "Floor Plan & Table Layout",
    shortLabel: "Floor Plan",
    description: "30-table ballroom grid, head table, oil lamp stage, and VIP seating.",
    icon: "Plan",
  },
  {
    id: "PROFIT",
    label: "Profitability & Food Cost Margin",
    shortLabel: "Profitability",
    description: "Revenue vs BOM food cost, casual wages, AC utilities, and per-pax margins.",
    icon: "Stats",
  },
  {
    id: "STEWARDS",
    label: "Casual Stewards & Wages",
    shortLabel: "Casual Stewards",
    description: "NIC verification, shift hours, night travel allowance, and petty cash voucher.",
    icon: "GuestKitchen",
  },
  {
    id: "HALLS",
    label: "Halls & Outdoor Lawns",
    shortLabel: "Hall Master",
    description: "Master venue specs, AC capacities, stage dimensions, and lawn setups.",
    icon: "Govt",
  },
];

export const BANQUET_SEGMENTED_OPTIONS: readonly SegmentedControlOption<BanquetAdminTabId>[] =
  BANQUET_ADMIN_TABS.map((t) => ({
    id: t.id,
    label: t.shortLabel,

    badge: t.badge,
  }));

export const DEFAULT_BANQUET_OVERVIEW_METRICS: BanquetOverviewMetrics = {
  totalBookingsThisMonth: 18,
  confirmedWeddings: 12,
  tentativeHolds: 6,
  expiringHoldsAlert: 2,
  totalRevenueLkr: 48500000,
  averageFoodCostMarginPct: 58.4,
  casualLaborPayoutTodayLkr: 64500,
};

// ============================================================================
// Translations
// ============================================================================

export interface BanquetAdminTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly defaultHotel: string;
  readonly totalBookings: string;
  readonly confirmed: string;
  readonly tentativeHolds: string;
  readonly pipelineRevenue: string;
  readonly foodCostMargin: string;
  readonly stewardLabor: string;
  readonly newBookingBtn: string;
  readonly finalSettlementBtn: string;
  readonly liquorPassBtn: string;
  readonly quickPrintBeo: string;
  readonly searchPlaceholder: string;
  readonly quickActions: string;
  readonly filterNavigation: string;
  readonly spotlightTitle: string;
  readonly closeBtn: string;
}

const TRANSLATIONS: Record<SupportedLanguage, BanquetAdminTranslations> = {
  en: {
    title: "Banquet, Wedding & MICE Operations",
    subtitle: "Auspicious Poruwa Ceremonies, BEO Blueprints, Table Layouts & Catering Logistics",
    defaultHotel: "Galle Face Heritage Hotel & Spa - Grand Ballroom",
    totalBookings: "Monthly Bookings",
    confirmed: "Confirmed Weddings",
    tentativeHolds: "Expiring Holds",
    pipelineRevenue: "Banquets Revenue",
    foodCostMargin: "Avg Food Margin",
    stewardLabor: "Casual Steward Labor",
    newBookingBtn: "New Booking Wizard",
    finalSettlementBtn: "Final Settlement",
    liquorPassBtn: "Liquor Gate Pass",
    quickPrintBeo: "Print Official BEO",
    searchPlaceholder: "Search function, couple name, BEO #, or hall (⌘K)...",
    quickActions: "Quick Actions",
    filterNavigation: "Banquet Workspace Navigation",
    spotlightTitle: "Command Palette & Quick Search",
    closeBtn: "Close",
  },
  si: {
    title: "මංගල උත්සව සහ සම්මන්ත්රණ මෙහෙයුම් මධ්යස්ථානය",
    subtitle: "සුබ නැකත් පෝරු මංගල්ය, BEO මෙහෙයුම් සැලසුම්, ආසන සැලසුම් සහ ආහාර පාන කළමනාකරණය",
    defaultHotel: "ගාලු මුවදොර උරුම හෝටලය - ප්රධාන උත්සව ශාලාව",
    totalBookings: "මාසික වෙන්කිරීම්",
    confirmed: "තහවුරු කළ මංගල උත්සව",
    tentativeHolds: "කල් ඉකුත්වන රඳවාගැනීම්",
    pipelineRevenue: "උත්සව ආදායම",
    foodCostMargin: "ආහාර ලාභ ප්රතිශතය",
    stewardLabor: "අනියම් සේවක වැටුප්",
    newBookingBtn: "නව උත්සව වෙන්කිරීම",
    finalSettlementBtn: "අවසාන බිල්පත් පියවීම",
    liquorPassBtn: "මධ්යසාර ඇතුළත් කිරීමේ බලපත්රය",
    quickPrintBeo: "BEO ලේඛනය මුද්රණය",
    searchPlaceholder: "උත්සවය, යුවළගේ නම, BEO අංකය සොයන්න (⌘K)...",
    quickActions: "ක්ෂණික ක්රියාකාරකම්",
    filterNavigation: "උත්සව මෙහෙයුම් මෙනුව",
    spotlightTitle: "විධාන පුවරුව සහ ක්ෂණික සෙවීම",
    closeBtn: "වසන්න",
  },
  ta: {
    title: "மண்டப, திருமண மற்றும் மாநாட்டு செயல்பாடுகள்",
    subtitle: "சுப முகூர்த்த திருமணங்கள், BEO செயல்பாட்டு திட்டங்கள், இருக்கை அமைப்பு மற்றும் உணவு சேவை",
    defaultHotel: "காலி பேஸ் ஹெரிட்டேஜ் ஹோட்டல் - கிராண்ட் பால்ரூம்",
    totalBookings: "மாத முன்பதிவுகள்",
    confirmed: "உறுதிசெய்த திருமணங்கள்",
    tentativeHolds: "காலாவதியாகும் முன்பதிவுகள்",
    pipelineRevenue: "மண்டப வருவாய்",
    foodCostMargin: "உணவு லாப வரம்பு",
    stewardLabor: "தற்காலிக ஊழியர் ஊதியம்",
    newBookingBtn: "புதிய முன்பதிவு",
    finalSettlementBtn: "இறுதி தீர்வு",
    liquorPassBtn: "மதுபான நுழைவு அனுமதி",
    quickPrintBeo: "அதிகாரப்பூர்வ BEO அச்சிடுக",
    searchPlaceholder: "நிகழ்வு, தம்பதியர் பெயர், BEO எண் தேடுக (⌘K)...",
    quickActions: "விரைவு நடவடிக்கைகள்",
    filterNavigation: "மண்டப செயல்பாடுகள் வழிசெலுத்தல்",
    spotlightTitle: "கட்டளை பலகை & விரைவு தேடல்",
    closeBtn: "மூடு",
  },
};

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function getBanquetAdminTranslations(
  lang: SupportedLanguage = "en",
): BanquetAdminTranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

export function calculateBanquetOverviewMetrics(
  overrides?: Partial<BanquetOverviewMetrics>,
): BanquetOverviewMetrics {
  return {
    ...DEFAULT_BANQUET_OVERVIEW_METRICS,
    ...overrides,
  };
}

export function formatBanquetLkr(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

// ============================================================================
// Subcomponents
// ============================================================================

interface BanquetPageHeaderProps {
  readonly propertyTitle: string;
  readonly text: BanquetAdminTranslations;
  readonly activeTab: BanquetAdminTabId;
  readonly onNewBookingClick: () => void;
  readonly onSettlementClick: () => void;
  readonly onLiquorGatePassClick: () => void;
  readonly onPrintBeoClick: () => void;
  readonly onOpenSpotlight: () => void;
}

function BanquetPageHeader({
  propertyTitle,
  text,
  activeTab,
  onNewBookingClick,
  onSettlementClick,
  onLiquorGatePassClick,
  onPrintBeoClick,
  onOpenSpotlight,
}: BanquetPageHeaderProps) {
  const currentTabDef = useMemo(
    () => BANQUET_ADMIN_TABS.find((t) => t.id === activeTab) ?? BANQUET_ADMIN_TABS[0],
    [activeTab],
  );

  return (
    <AdminPageHeader
      title={text.title}
      subtitle={`${text.subtitle} • Current: ${currentTabDef?.label}`}
      propertyTitle={propertyTitle}
      actions={
        <>
          <button
            type="button"
            onClick={onOpenSpotlight}
            className="admin-btn-secondary min-h-[38px] text-xs flex items-center gap-2 cursor-pointer"
            title="Spotlight Search (⌘K)"
          >
            <span>Search...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onSettlementClick}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
          >
            <span>{text.finalSettlementBtn}</span>
          </button>

          <button
            type="button"
            onClick={onLiquorGatePassClick}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer text-amber-800 dark:text-amber-400"
          >
            <span>{text.liquorPassBtn}</span>
          </button>

          <button
            type="button"
            onClick={onPrintBeoClick}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
          >
            <span>{text.quickPrintBeo}</span>
          </button>

          <button
            type="button"
            onClick={onNewBookingClick}
            className="admin-btn-primary min-h-[38px] text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{text.newBookingBtn}</span>
          </button>
        </>
      }
    />
  );
}

interface BanquetOverviewStatsProps {
  readonly metrics: BanquetOverviewMetrics;
  readonly text: BanquetAdminTranslations;
  readonly onSelectTab: (tabId: BanquetAdminTabId) => void;
}

function BanquetOverviewStatsRibbon({ metrics, text, onSelectTab }: BanquetOverviewStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Monthly Bookings */}
      <AdminKpiCard
        title={text.totalBookings}
        size="sm"
        value={`${metrics.totalBookingsThisMonth} Events`}
        badge={{ text: "Pipeline", variant: "info" }}
        subtitle="Ballroom & lawn functions"
        onClick={() => onSelectTab("CALENDAR")}
      />

      {/* 2. Confirmed Weddings */}
      <AdminKpiCard
        title={text.confirmed}
        size="sm"
        value={`${metrics.confirmedWeddings} Locked`}
        badge={{ text: "Deposit Paid", variant: "success" }}
        subtitle="Poruwa & Homecoming"
        onClick={() => onSelectTab("CALENDAR")}
      />

      {/* 3. Expiring Tentative Holds */}
      <AdminKpiCard
        title={text.tentativeHolds}
        size="sm"
        value={metrics.expiringHoldsAlert}
        badge={{ text: `${metrics.tentativeHolds} Holds`, variant: "danger" }}
        subtitle="Expiring in <48 hours"
        onClick={() => onSelectTab("LEADS")}
      />

      {/* 4. Banquet Revenue */}
      <AdminKpiCard
        title={text.pipelineRevenue}
        size="sm"
        value={formatBanquetLkr(metrics.totalRevenueLkr)}
        badge={{ text: "Pipeline", variant: "neutral" }}
        subtitle="Menu & hall billing"
        onClick={() => onSelectTab("PROFIT")}
      />

      {/* 5. Food Cost Margin */}
      <AdminKpiCard
        title={text.foodCostMargin}
        size="sm"
        value={`${metrics.averageFoodCostMarginPct.toFixed(1)}%`}
        badge={{ text: "Target >55%", variant: "success" }}
        subtitle="Gross catering margin"
        onClick={() => onSelectTab("PROFIT")}
      />

      {/* 6. Casual Steward Payout */}
      <AdminKpiCard
        title={text.stewardLabor}
        size="sm"
        value={formatBanquetLkr(metrics.casualLaborPayoutTodayLkr)}
        badge={{ text: "Wages", variant: "warning" }}
        subtitle="Daily steward wage pool"
        onClick={() => onSelectTab("STEWARDS")}
      />
    </div>
  );
}

interface BanquetTabContentProps {
  readonly activeTab: BanquetAdminTabId;
  readonly tenantId?: string | undefined;
  readonly propertyTitle: string;
  readonly language: SupportedLanguage;
  readonly onOpenBookingWizard: () => void;
}

function BanquetTabContent({
  activeTab,
  tenantId,
  propertyTitle,
  language,
}: BanquetTabContentProps) {
  switch (activeTab) {
    case "CALENDAR":
      return <BanquetCalendar propertyName={propertyTitle} language={language} />;
    case "BEO":
      return (
        <div className="space-y-6">
          <PrintableBeoSheet language={language} />
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 text-slate-900 mb-3">
              Per-Table Sri Lankan Bites, Corkage & Bar Setup Directives
            </h3>
            <BanquetBarAndBitesForm language={language} />
          </div>
        </div>
      );
    case "MENU":
      return (
        <BanquetMenuSelector
          packageTierName="Royal Kandyan Platinum Buffet"
          basePricePerPaxLkr={7500}
          guestPaxCount={250}
          language={language}
        />
      );
    case "LEADS":
      return <BanquetLeadQueue hotelName={propertyTitle} language={language} />;
    case "TABLES":
      return <BanquetTableLayout language={language} />;
    case "PROFIT":
      return <BanquetProfitCard language={language} />;
    case "STEWARDS":
      return <CasualStewardSheet hotelName={propertyTitle} language={language} />;
    case "HALLS":
      return (
        <BanquetHallSetup tenantId={tenantId} propertyName={propertyTitle} language={language} />
      );
  }
}

interface SpotlightModalProps {
  readonly isOpen: boolean;
  readonly text: BanquetAdminTranslations;
  readonly onSelectTab: (tabId: BanquetAdminTabId) => void;
  readonly onOpenNewBooking: () => void;
  readonly onOpenSettlement: () => void;
  readonly onOpenLiquor: () => void;
  readonly onClose: () => void;
}

function SpotlightModal({
  isOpen,
  text,
  onSelectTab,
  onOpenNewBooking,
  onOpenSettlement,
  onOpenLiquor,
  onClose,
}: SpotlightModalProps) {
  const [search, setSearch] = useState("");
  const searchInputId = useId();

  if (!isOpen) return null;

  const filteredTabs = BANQUET_ADMIN_TABS.filter(
    (tab) =>
      tab.label.toLowerCase().includes(search.toLowerCase()) ||
      tab.shortLabel.toLowerCase().includes(search.toLowerCase()) ||
      tab.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <dialog
      open
      aria-label={text.spotlightTitle}
      className="fixed inset-0 z-50 m-0 w-full h-full p-0 bg-transparent flex items-start justify-center pt-20 px-4"
    >
      <button
        type="button"
        aria-label={text.closeBtn}
        onClick={onClose}
        className="fixed inset-0 -z-10 w-full h-full bg-black/60 backdrop-blur-sm border-0 cursor-default"
      />
      <div className="w-full max-w-xl rounded-2xl bg-white bg-white border border-slate-200 border-[#E2E8F0] shadow-2xl overflow-hidden p-4 space-y-4">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 border-[#E2E8F0]">
          <input
            id={searchInputId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={text.searchPlaceholder}
            className="w-full bg-transparent text-sm text-slate-900 text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            ESC
          </button>
        </div>

        {/* Quick Commands */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
            {text.quickActions}
          </span>
          <div className="grid grid-cols-3 gap-2 p-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewBooking();
              }}
              className="p-2.5 rounded-xl text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs text-emerald-800 font-semibold"
            >
              Clean {text.newBookingBtn}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettlement();
              }}
              className="p-2.5 rounded-xl text-left bg-slate-100 bg-slate-100 hover:bg-slate-200 text-xs text-slate-800 font-semibold"
            >
              Card {text.finalSettlementBtn}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLiquor();
              }}
              className="p-2.5 rounded-xl text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs text-amber-800 font-semibold"
            >
              Bottle {text.liquorPassBtn}
            </button>
          </div>
        </div>

        {/* Filtered Tabs */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
            {text.filterNavigation}
          </span>
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelectTab(tab.id);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 text-slate-900">
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-500">{tab.description}</div>
                </div>
              </div>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 ">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}

// ============================================================================
// Main BanquetsAdminPage Component
// ============================================================================

export const BanquetsAdminPage: FC<BanquetsAdminPageProps> = ({
  tenantId = "TENANT-GALLE-FACE-01",
  propertyTitle: customTitle,
  initialTab = "CALENDAR",
  language = "en",
  overviewMetrics: customMetrics,
  onTabChange,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<BanquetAdminTabId>(initialTab);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isLiquorModalOpen, setIsLiquorModalOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  const t = getBanquetAdminTranslations(language);
  const propertyTitle = customTitle || t.defaultHotel;

  const metrics = useMemo(() => calculateBanquetOverviewMetrics(customMetrics), [customMetrics]);

  const handleTabSelect = (tab: BanquetAdminTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleBookingSubmit = async (_booking: BanquetBookingFormData) => {
    setIsBookingModalOpen(false);
  };

  const handlePrintBeo = () => {
    handleTabSelect("BEO");
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  return (
    <div className={`space-y-6 font-sf-pro text-slate-900 ${className}`}>
      {/* 1. Header Banner with Actions */}
      <BanquetPageHeader
        propertyTitle={propertyTitle}
        text={t}
        activeTab={activeTab}
        onNewBookingClick={() => setIsBookingModalOpen(true)}
        onSettlementClick={() => setIsSettlementModalOpen(true)}
        onLiquorGatePassClick={() => setIsLiquorModalOpen(true)}
        onPrintBeoClick={handlePrintBeo}
        onOpenSpotlight={() => setIsSpotlightOpen(true)}
      />

      {/* 2. Executive Overview KPI Ribbon */}
      <BanquetOverviewStatsRibbon metrics={metrics} text={t} onSelectTab={handleTabSelect} />

      {/* 3. Apple HIG Segmented Navigation Bar */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <SegmentedControl<BanquetAdminTabId>
          options={BANQUET_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="lg"
          ariaLabel={t.filterNavigation}
        />
      </div>

      {/* 4. Dynamic Tab Workspace Content */}
      <div className="w-full">
        <BanquetTabContent
          activeTab={activeTab}
          tenantId={tenantId}
          propertyTitle={propertyTitle}
          language={language}
          onOpenBookingWizard={() => setIsBookingModalOpen(true)}
        />
      </div>

      {/* 5. Modals & Dialogs */}
      <BanquetBookingModal
        isOpen={isBookingModalOpen}
        tenantId={tenantId}
        language={language}
        onClose={() => setIsBookingModalOpen(false)}
        onSubmitBooking={handleBookingSubmit}
      />

      <BanquetSettlementModal
        isOpen={isSettlementModalOpen}
        language={language}
        onClose={() => setIsSettlementModalOpen(false)}
      />

      <LiquorBottleLogModal
        isOpen={isLiquorModalOpen}
        language={language}
        onClose={() => setIsLiquorModalOpen(false)}
      />

      <SpotlightModal
        isOpen={isSpotlightOpen}
        text={t}
        onSelectTab={handleTabSelect}
        onOpenNewBooking={() => setIsBookingModalOpen(true)}
        onOpenSettlement={() => setIsSettlementModalOpen(true)}
        onOpenLiquor={() => setIsLiquorModalOpen(true)}
        onClose={() => setIsSpotlightOpen(false)}
      />
    </div>
  );
};
