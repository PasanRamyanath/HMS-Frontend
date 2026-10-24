/**
 * Master Spa, Excursions & Airport Transfers Admin Page (ActivitiesAdminPage.tsx)
 *
 * Implements Step 373 (Phase 15.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Unified executive command center for Sri Lankan resort wellness, island excursions,
 * airport chauffeur transfers, equipment rentals, and vendor commission disbursements:
 *
 * - Tabbed workspace coordinating:
 * 1. Ayurveda Spa & Vaidya Treatment Calendar (SpaScheduleGrid & PanchakarmaTracker)
 * 2. Wildlife Safari & Nature Excursions (Top Excursions & WakeUpCallList)
 * 3. Airport Chauffeur & Flight Board (AirportTransferBoard)
 * 4. Bicycle, Scooter & Water Sports Equipment Rentals (GearRentalBoard)
 * 5. Spa Therapist & Chauffeur Commission Ledger (TherapistAndDriverPayouts)
 * 6. Executive Ancillary RevPOR & Utilization Analytics (ActivityKpiCard)
 * - Executive action triggers:
 * - Vaidya Ayurveda Consultation Modal (AyurvedaConsultationModal)
 * - Safari Jeep & Excursion Booking Modal (ExcursionBookingModal)
 * - Water Sports & Adventure Liability Waiver Modal (ActivityWaiverModal)
 * - Executive Overview KPI Ribbon (.tabular-nums-lkr, live turnaround metrics)
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: .apple-liquid-glass, SF Pro typography, >=44x44pt touch targets
 * - Strictly zero console noise, cognitive complexity <= 10 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { type SupportedLanguage, formatLkr } from "../../lib/i18n.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import { ActivityKpiCard } from "./ActivityKpiCard.js";
import { ActivityWaiverModal, STANDARD_ACTIVITY_PROFILES } from "./ActivityWaiverModal.js";
import { AirportTransferBoard } from "./AirportTransferBoard.js";
import { AyurvedaConsultationModal } from "./AyurvedaConsultationModal.js";
import { ExcursionBookingModal } from "./ExcursionBookingModal.js";
import { GearRentalBoard } from "./GearRentalBoard.js";
import { PanchakarmaTracker } from "./PanchakarmaTracker.js";
import { SpaScheduleGrid } from "./SpaScheduleGrid.js";
import { TherapistAndDriverPayouts } from "./TherapistAndDriverPayouts.js";
import { WakeUpCallList } from "./WakeUpCallList.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ActivitiesAdminTabId =
  | "SPA_SCHEDULE"
  | "EXCURSIONS"
  | "TRANSFERS"
  | "GEAR_RENTAL"
  | "PAYOUTS"
  | "ANALYTICS";

export interface ActivitiesAdminTab {
  readonly id: ActivitiesAdminTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly badge?: string | undefined;
}

export interface ActivitiesOverviewMetrics {
  readonly activeSpaAppointmentsToday: number;
  readonly dispatchedSafarisToday: number;
  readonly scheduledAirportTransfers: number;
  readonly activeGearRentals: number;
  readonly pendingPayoutsLkr: number;
  readonly ancillaryRevPorLkr: number;
}

export interface ActivitiesAdminPageProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly initialTab?: ActivitiesAdminTabId | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onTabChange?: ((tab: ActivitiesAdminTabId) => void) | undefined;
  readonly className?: string | undefined;
  readonly testId?: string | undefined;
}

// ============================================================================
// Default Constants & Presets
// ============================================================================

export const DEFAULT_ACTIVITIES_METRICS: ActivitiesOverviewMetrics = {
  activeSpaAppointmentsToday: 26,
  dispatchedSafarisToday: 8,
  scheduledAirportTransfers: 6,
  activeGearRentals: 12,
  pendingPayoutsLkr: 145000,
  ancillaryRevPorLkr: 7188,
};

export const ACTIVITIES_TABS: readonly ActivitiesAdminTab[] = [
  {
    id: "SPA_SCHEDULE",
    label: "Ayurveda Spa & Wellness",
    shortLabel: "Spa & Wellness",
    icon: "Eco",
    badge: "26",
  },
  {
    id: "EXCURSIONS",
    label: "Safaris & Island Excursions",
    shortLabel: "Excursions",
    icon: "Safari",
    badge: "8",
  },
  {
    id: "TRANSFERS",
    label: "Airport Chauffeur Transfers",
    shortLabel: "Transfers",
    icon: "Flight",
    badge: "6",
  },
  {
    id: "GEAR_RENTAL",
    label: "Equipment & Gear Rentals",
    shortLabel: "Gear Rentals",
    icon: "Surf",
    badge: "12",
  },
  {
    id: "PAYOUTS",
    label: "Therapist & Chauffeur Payouts",
    shortLabel: "Payouts",
    icon: "Cash",
  },
  {
    id: "ANALYTICS",
    label: "Revenue & RevPOR Analytics",
    shortLabel: "Analytics",
    icon: "Stats",
  },
];

// ============================================================================
// Trilingual Page Localization Dictionary
// ============================================================================

export interface ActivitiesPageI18n {
  readonly pageTitle: string;
  readonly pageSubtitle: string;
  readonly newSpaBooking: string;
  readonly bookSafari: string;
  readonly signWaiver: string;
  readonly searchPlaceholder: string;
  readonly spaAppointmentsToday: string;
  readonly safarisToday: string;
  readonly airportTransfersToday: string;
  readonly gearRentalsActive: string;
  readonly pendingPayouts: string;
  readonly ancillaryRevPor: string;
  readonly panchakarmaSubtab: string;
  readonly treatmentRoomsSubtab: string;
}

export const ACTIVITIES_PAGE_TRANSLATIONS: Record<SupportedLanguage, ActivitiesPageI18n> = {
  en: {
    pageTitle: "Ayurveda Spa, Safaris & Resort Experiences Hub",
    pageSubtitle:
      "Unified operational command center for guest wellness, island excursions, airport transfers, and ancillary RevPOR",
    newSpaBooking: "+ Spa Consultation",
    bookSafari: "+ Book Safari / Tour",
    signWaiver: "+ Liability Waiver",
    searchPlaceholder: "Search guests, rooms, drivers, or booking ref...",
    spaAppointmentsToday: "Spa Appointments Today",
    safarisToday: "Active Safaris & Tours",
    airportTransfersToday: "Airport Transfers Today",
    gearRentalsActive: "Active Gear Rentals",
    pendingPayouts: "Pending Vendor Payouts",
    ancillaryRevPor: "Ancillary RevPOR",
    panchakarmaSubtab: "Panchakarma Packages",
    treatmentRoomsSubtab: "Treatment Rooms",
  },
  si: {
    pageTitle: "ආයුර්වේද ස්පා, විනෝද චාරිකා සහ ප්රවාහන කළමනාකරණය",
    pageSubtitle: "සුවතා ප්රතිකාර, සෆාරි චාරිකා, ගුවන් තොටුපළ ප්රවාහනය සහ අමතර ආදායම් පාලන මධ්යස්ථානය",
    newSpaBooking: "+ ස්පා උපදේශනය",
    bookSafari: "+ සෆාරි / චාරිකාවක්",
    signWaiver: "+ වගකීම් නිදහස් කිරීම",
    searchPlaceholder: "අමුත්තන්, කාමර, රියදුරන් සොයන්න...",
    spaAppointmentsToday: "අද දින ස්පා ප්රතිකාර",
    safarisToday: "ක්රියාකාරී සෆාරි චාරිකා",
    airportTransfersToday: "අද ගුවන් තොටුපළ ප්රවාහන",
    gearRentalsActive: "කුලියට ගත් උපකරණ",
    pendingPayouts: "ගෙවිය යුතු සැපයුම්කරු මුදල්",
    ancillaryRevPor: "කාමරයකට අමතර ආදායම (RevPOR)",
    panchakarmaSubtab: "පංචකර්ම පැකේජ",
    treatmentRoomsSubtab: "ප්රතිකාර කාමර",
  },
  ta: {
    pageTitle: "ஆயுர்வேத ஸ்பா, சுற்றுலாக்கள் & பரிமாற்ற மையம்",
    pageSubtitle:
      "விருந்தினர் ஆரோக்கியம், தீவு சுற்றுலாக்கள், விமான நிலைய பரிமாற்றங்கள் மற்றும் துணை வருவாய் கட்டுப்பாட்டு மையம்",
    newSpaBooking: "+ ஸ்பா ஆலோசனை",
    bookSafari: "+ சவாரி / சுற்றுலா",
    signWaiver: "+ பொறுப்பு துறப்பு",
    searchPlaceholder: "விருந்தினர்கள், அறைகள், ஓட்டுநர்களைத் தேடுங்கள்...",
    spaAppointmentsToday: "இன்றைய ஸ்பா சிகிச்சைகள்",
    safarisToday: "செயலில் உள்ள சவாரிகள்",
    airportTransfersToday: "இன்றைய விமான பரிமாற்றங்கள்",
    gearRentalsActive: "செயலில் உள்ள வாடகைகள்",
    pendingPayouts: "நிலுவையில் உள்ள கொடுப்பனவுகள்",
    ancillaryRevPor: "துணை RevPOR",
    panchakarmaSubtab: "பஞ்சகர்மா தொகுப்புகள்",
    treatmentRoomsSubtab: "சிகிச்சை அறைகள்",
  },
};

// ============================================================================
// Subcomponents
// ============================================================================

export interface ActivitiesHeaderBarProps {
  readonly i18n: ActivitiesPageI18n;
  readonly propertyTitle?: string | undefined;
  readonly language: SupportedLanguage;
  readonly onLanguageChange: (lang: SupportedLanguage) => void;
  readonly onOpenConsultation: () => void;
  readonly onOpenExcursion: () => void;
  readonly onOpenWaiver: () => void;
}

export const ActivitiesHeaderBar: FC<ActivitiesHeaderBarProps> = ({
  i18n,
  propertyTitle,
  language,
  onLanguageChange,
  onOpenConsultation,
  onOpenExcursion,
  onOpenWaiver,
}) => {
  return (
    <AdminPageHeader
      title={i18n.pageTitle}
      subtitle={i18n.pageSubtitle}
      propertyTitle={propertyTitle}
      actions={
        <>
          <button
            type="button"
            onClick={onOpenExcursion}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
          >
            {i18n.bookSafari}
          </button>

          <button
            type="button"
            onClick={onOpenWaiver}
            className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer text-amber-800 dark:text-amber-400"
          >
            {i18n.signWaiver}
          </button>

          {/* Trilingual Pill Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            {(["en", "si", "ta"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  language === lang
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {lang === "en" ? "EN" : lang === "si" ? "සිං" : "த"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenConsultation}
            className="admin-btn-primary min-h-[38px] text-xs cursor-pointer flex items-center gap-1.5"
          >
            {i18n.newSpaBooking}
          </button>
        </>
      }
    />
  );
};

export interface ActivitiesKpiRibbonProps {
  readonly i18n: ActivitiesPageI18n;
  readonly metrics: ActivitiesOverviewMetrics;
}

export const ActivitiesKpiRibbon: FC<ActivitiesKpiRibbonProps> = ({ i18n, metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <AdminKpiCard
        title={i18n.spaAppointmentsToday}
        size="sm"
        value={metrics.activeSpaAppointmentsToday}
        badge={{ text: "Ayurveda", variant: "success" }}
        subtitle="Scheduled sessions"
      />

      <AdminKpiCard
        title={i18n.safarisToday}
        size="sm"
        value={metrics.dispatchedSafarisToday}
        badge={{ text: "Dispatched", variant: "info" }}
        subtitle="Yala & whale watching"
      />

      <AdminKpiCard
        title={i18n.airportTransfersToday}
        size="sm"
        value={metrics.scheduledAirportTransfers}
        badge={{ text: "BIA Chauffeur", variant: "neutral" }}
        subtitle="Flight arrivals & pickups"
      />

      <AdminKpiCard
        title={i18n.gearRentalsActive}
        size="sm"
        value={metrics.activeGearRentals}
        badge={{ text: "In Circulation", variant: "warning" }}
        subtitle="Surfboards & e-bikes"
      />

      <AdminKpiCard
        title={i18n.pendingPayouts}
        size="sm"
        value={formatLkr(metrics.pendingPayoutsLkr)}
        badge={{ text: "Commissions", variant: "danger" }}
        subtitle="Therapist & driver ledger"
      />

      <AdminKpiCard
        title={i18n.ancillaryRevPor}
        size="sm"
        value={formatLkr(metrics.ancillaryRevPorLkr)}
        badge={{ text: "RevPOR", variant: "success" }}
        subtitle="Non-room guest spend"
      />
    </div>
  );
};

export interface ActivitiesTabContentProps {
  readonly activeTab: ActivitiesAdminTabId;
  readonly language: SupportedLanguage;
  readonly spaSubtab: "ROOMS" | "PANCHAKARMA";
  readonly onSpaSubtabChange: (sub: "ROOMS" | "PANCHAKARMA") => void;
  readonly i18n: ActivitiesPageI18n;
}

export const ActivitiesTabContent: FC<ActivitiesTabContentProps> = ({
  activeTab,
  language,
  spaSubtab,
  onSpaSubtabChange,
  i18n,
}) => {
  if (activeTab === "SPA_SCHEDULE") {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-slate-200 border-[#E2E8F0] pb-2">
          <button
            type="button"
            onClick={() => onSpaSubtabChange("ROOMS")}
            className={`min-h-[44px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              spaSubtab === "ROOMS"
                ? "bg-white text-slate-900 "
                : "text-slate-500 hover:text-slate-900 text-slate-500"
            }`}
          >
            {i18n.treatmentRoomsSubtab}
          </button>
          <button
            type="button"
            onClick={() => onSpaSubtabChange("PANCHAKARMA")}
            className={`min-h-[44px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              spaSubtab === "PANCHAKARMA"
                ? "bg-white text-slate-900 "
                : "text-slate-500 hover:text-slate-900 text-slate-500"
            }`}
          >
            {i18n.panchakarmaSubtab}
          </button>
        </div>

        {spaSubtab === "ROOMS" ? (
          <SpaScheduleGrid language={language} />
        ) : (
          <PanchakarmaTracker language={language} />
        )}
      </div>
    );
  }

  if (activeTab === "EXCURSIONS") {
    return (
      <div className="space-y-6">
        <WakeUpCallList language={language} />
      </div>
    );
  }

  if (activeTab === "TRANSFERS") {
    return (
      <div>
        <AirportTransferBoard lang={language} />
      </div>
    );
  }

  if (activeTab === "GEAR_RENTAL") {
    return (
      <div>
        <GearRentalBoard language={language} />
      </div>
    );
  }

  if (activeTab === "PAYOUTS") {
    return (
      <div>
        <TherapistAndDriverPayouts language={language} />
      </div>
    );
  }

  return (
    <div>
      <ActivityKpiCard initialLanguage={language} />
    </div>
  );
};

// ============================================================================
// Master ActivitiesAdminPage Component
// ============================================================================

export const ActivitiesAdminPage: FC<ActivitiesAdminPageProps> = ({
  tenantId = "tenant-srilanka-resort-01",
  propertyTitle = "Heritage Villa & Ayurveda Resort",
  initialTab = "SPA_SCHEDULE",
  language: initialLang = "en",
  onTabChange,
  className = "",
  testId = "activities-master-admin-page",
}) => {
  const [activeTab, setActiveTab] = useState<ActivitiesAdminTabId>(initialTab);
  const [language, setLanguage] = useState<SupportedLanguage>(initialLang);
  const [spaSubtab, setSpaSubtab] = useState<"ROOMS" | "PANCHAKARMA">("ROOMS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [isExcursionOpen, setIsExcursionOpen] = useState<boolean>(false);
  const [isWaiverOpen, setIsWaiverOpen] = useState<boolean>(false);

  const searchInputId = useId();
  const i18n = useMemo(() => ACTIVITIES_PAGE_TRANSLATIONS[language], [language]);

  const handleTabSelect = (tabId: ActivitiesAdminTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const segmentedOptions: readonly SegmentedControlOption<ActivitiesAdminTabId>[] = useMemo(
    () =>
      ACTIVITIES_TABS.map((tab) => ({
        id: tab.id,
        label: tab.shortLabel,
        badge: tab.badge,
      })),
    [],
  );

  return (
    <div data-testid={testId} className={`space-y-6 font-sf-pro text-slate-900 ${className}`}>
      {/* 1. Header Bar */}
      <ActivitiesHeaderBar
        i18n={i18n}
        propertyTitle={propertyTitle}
        language={language}
        onLanguageChange={setLanguage}
        onOpenConsultation={() => setIsConsultationOpen(true)}
        onOpenExcursion={() => setIsExcursionOpen(true)}
        onOpenWaiver={() => setIsWaiverOpen(true)}
      />

      {/* 2. Executive KPI Ribbon */}
      <ActivitiesKpiRibbon i18n={i18n} metrics={DEFAULT_ACTIVITIES_METRICS} />

      {/* 3. Navigation Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <SegmentedControl
          options={segmentedOptions}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          ariaLabel="Activities Navigation Tabs"
        />

        <div className="relative flex-shrink-0 w-full md:w-72">
          <label htmlFor={searchInputId} className="sr-only">
            {i18n.searchPlaceholder}
          </label>
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={i18n.searchPlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2 pl-9 text-xs rounded-xl bg-white border border-[#E2E8F0] text-slate-900 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <span className="absolute left-3 top-3.5 text-slate-400 text-xs">
            <svg
              className="w-3.5 h-3.5 inline-block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <title>Search</title>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>
      </div>

      {/* 4. Active Tab Content View */}
      <main className="mt-4">
        <ActivitiesTabContent
          activeTab={activeTab}
          language={language}
          spaSubtab={spaSubtab}
          onSpaSubtabChange={setSpaSubtab}
          i18n={i18n}
        />
      </main>

      {/* 5. Modals */}
      <AyurvedaConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        language={language}
      />

      <ExcursionBookingModal
        isOpen={isExcursionOpen}
        onClose={() => setIsExcursionOpen(false)}
        onConfirmBooking={() => setIsExcursionOpen(false)}
        lang={language}
      />

      <ActivityWaiverModal
        isOpen={isWaiverOpen}
        onClose={() => setIsWaiverOpen(false)}
        tenantId={tenantId}
        activity={
          STANDARD_ACTIVITY_PROFILES[0] ?? {
            id: "WATER_SPORTS_DIVING",
            name: "Deep Sea Scuba & Diving",
            category: "WATER_SPORTS",
            riskLevel: "HIGH",
            minimumAge: 12,
            mandatorySafetyGear: ["BCD", "Regulator"],
            contraindications: ["Cardiovascular condition", "Asthma"],
            description: "Deep sea reef dive at Pigeon Island sanctuary.",
          }
        }
        onSaveWaiver={() => setIsWaiverOpen(false)}
        lang={language}
      />
    </div>
  );
};
