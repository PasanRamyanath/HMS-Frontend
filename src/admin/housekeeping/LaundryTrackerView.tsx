/**
 * Guest Laundry Job Tracker & Folio Auto-Poster (LaundryTrackerView.tsx)
 *
 * Operations hub for hotel laundry managers and housekeeping runners.
 * Tracks guest laundry bags through the 4-stage lifecycle:
 * Picked Up -> Washing -> Ironing -> Returned to Room
 * and auto-posts itemized 4-stage compounding statutory tax charges to guest folios.
 *
 * Operational & Hospitality Capabilities:
 * - 4-Stage visual lifecycle tracker: PICKED_UP -> WASHING -> IRONING -> RETURNED_TO_ROOM
 * - 1-Tap stage progression buttons with >= 44x44pt ergonomic touch targets
 * - Instant "Post to Room Folio" with 4-stage Sri Lankan statutory taxes (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)
 * - Express 4-Hour Turnaround callout with +50% surcharge calculations
 * - KPI summary cards: Active Jobs, Washing, Ironing, Ready to Return, Folio Revenue
 * - Slide-over inspection drawer for garment checklist and delicate fabric notes
 * - Audio feedback on status transitions and folio postings via Web Audio chime
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import type { LaundryServiceType } from "../../lib/laundryCatalog.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LaundryJobStage = "PICKED_UP" | "WASHING" | "IRONING" | "RETURNED_TO_ROOM";

export type LaundryPostingStatus = "PENDING_POST" | "POSTED_TO_FOLIO" | "COMPLIMENTARY";

export type LaundryFilterTab = "ALL" | LaundryJobStage | "EXPRESS_ONLY";

export interface LaundryJobGarmentLine {
  readonly id: string;
  readonly garmentName: string;
  readonly serviceType: LaundryServiceType;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly lineTotalLkr: number;
}

export interface LaundryJobFinancialSummary {
  readonly piecesCount: number;
  readonly standardSubtotalLkr: number;
  readonly isExpress: boolean;
  readonly expressSurchargeLkr: number;
  readonly netBaseLkr: number;
  readonly scLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
}

export interface LaundryJobRecord {
  readonly jobId: string;
  readonly bagTagNumber: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly folioId: string;
  readonly stage: LaundryJobStage;
  readonly isExpress: boolean;
  readonly pickupTimeIso: string;
  readonly estimatedReadyTimeIso: string;
  readonly returnedTimeIso?: string | undefined;
  readonly items: readonly LaundryJobGarmentLine[];
  readonly financialSummary: LaundryJobFinancialSummary;
  readonly postingStatus: LaundryPostingStatus;
  readonly specialCareNotes?: string | undefined;
  readonly attendantName?: string | undefined;
}

export interface LaundryTrackerViewProps {
  readonly tenantId?: string | undefined;
  readonly propertyName?: string | undefined;
  readonly initialJobs?: readonly LaundryJobRecord[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPostToFolio?: ((job: LaundryJobRecord) => Promise<void> | void) | undefined;
  readonly onStageChange?:
    | ((jobId: string, newStage: LaundryJobStage) => Promise<void> | void)
    | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_LAUNDRY_JOBS: readonly LaundryJobRecord[] = [
  {
    jobId: "lnd-job-001",
    bagTagNumber: "LND-101-08",
    roomNumber: "101",
    guestName: "Pasan Ramyanath (VIP)",
    folioId: "FOL-2026-101",
    stage: "WASHING",
    isExpress: true,
    pickupTimeIso: "2026-10-20T08:30:00Z",
    estimatedReadyTimeIso: "2026-10-20T12:30:00Z",
    items: [
      {
        id: "lnd-line-1",
        garmentName: "Linen Long-Sleeve Shirt",
        serviceType: "WASH_AND_IRON",
        quantity: 2,
        unitPriceLkr: 850,
        lineTotalLkr: 1700,
      },
      {
        id: "lnd-line-2",
        garmentName: "Cotton Trousers / Chinos",
        serviceType: "WASH_AND_IRON",
        quantity: 1,
        unitPriceLkr: 950,
        lineTotalLkr: 950,
      },
    ],
    financialSummary: {
      piecesCount: 3,
      standardSubtotalLkr: 2650,
      isExpress: true,
      expressSurchargeLkr: 1325,
      netBaseLkr: 3975,
      scLkr: 397.5,
      tdlLkr: 43.73,
      ssclLkr: 109.31,
      vatLkr: 806.72,
      grandTotalLkr: 5332.26,
    },
    postingStatus: "PENDING_POST",
    specialCareNotes: "Cold water wash only for organic linen shirt.",
    attendantName: "Kamal Silva",
  },
  {
    jobId: "lnd-job-002",
    bagTagNumber: "LND-204-12",
    roomNumber: "204",
    guestName: "Lady Sarah Jenkins",
    folioId: "FOL-2026-204",
    stage: "IRONING",
    isExpress: false,
    pickupTimeIso: "2026-10-20T07:15:00Z",
    estimatedReadyTimeIso: "2026-10-20T17:00:00Z",
    items: [
      {
        id: "lnd-line-3",
        garmentName: "Silk Evening Saree / Wrap",
        serviceType: "DRY_CLEAN",
        quantity: 1,
        unitPriceLkr: 2200,
        lineTotalLkr: 2200,
      },
      {
        id: "lnd-line-4",
        garmentName: "Ladies Blouse / Top",
        serviceType: "PRESS_ONLY",
        quantity: 2,
        unitPriceLkr: 500,
        lineTotalLkr: 1000,
      },
    ],
    financialSummary: {
      piecesCount: 3,
      standardSubtotalLkr: 3200,
      isExpress: false,
      expressSurchargeLkr: 0,
      netBaseLkr: 3200,
      scLkr: 320,
      tdlLkr: 35.2,
      ssclLkr: 88,
      vatLkr: 649.44,
      grandTotalLkr: 4292.64,
    },
    postingStatus: "PENDING_POST",
    specialCareNotes: "Pure Ceylon silk - low iron heat setting.",
    attendantName: "Nimal Perera",
  },
  {
    jobId: "lnd-job-003",
    bagTagNumber: "LND-302-04",
    roomNumber: "302",
    guestName: "Dr. Ananya Sharma",
    folioId: "FOL-2026-302",
    stage: "PICKED_UP",
    isExpress: false,
    pickupTimeIso: "2026-10-20T09:00:00Z",
    estimatedReadyTimeIso: "2026-10-20T18:00:00Z",
    items: [
      {
        id: "lnd-line-5",
        garmentName: "Cotton Safari Shorts",
        serviceType: "WASH_AND_IRON",
        quantity: 3,
        unitPriceLkr: 650,
        lineTotalLkr: 1950,
      },
    ],
    financialSummary: {
      piecesCount: 3,
      standardSubtotalLkr: 1950,
      isExpress: false,
      expressSurchargeLkr: 0,
      netBaseLkr: 1950,
      scLkr: 195,
      tdlLkr: 21.45,
      ssclLkr: 53.63,
      vatLkr: 395.75,
      grandTotalLkr: 2615.83,
    },
    postingStatus: "PENDING_POST",
    attendantName: "Kamal Silva",
  },
  {
    jobId: "lnd-job-004",
    bagTagNumber: "LND-105-02",
    roomNumber: "105",
    guestName: "Markus Weber",
    folioId: "FOL-2026-105",
    stage: "RETURNED_TO_ROOM",
    isExpress: true,
    pickupTimeIso: "2026-10-19T14:00:00Z",
    estimatedReadyTimeIso: "2026-10-19T18:00:00Z",
    returnedTimeIso: "2026-10-19T17:45:00Z",
    items: [
      {
        id: "lnd-line-6",
        garmentName: "Business Suit 2-Piece",
        serviceType: "DRY_CLEAN",
        quantity: 1,
        unitPriceLkr: 3200,
        lineTotalLkr: 3200,
      },
    ],
    financialSummary: {
      piecesCount: 1,
      standardSubtotalLkr: 3200,
      isExpress: true,
      expressSurchargeLkr: 1600,
      netBaseLkr: 4800,
      scLkr: 480,
      tdlLkr: 52.8,
      ssclLkr: 132,
      vatLkr: 974.16,
      grandTotalLkr: 6438.96,
    },
    postingStatus: "POSTED_TO_FOLIO",
    attendantName: "Chathura Bandara",
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface LaundryTrackerTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly searchPlaceholder: string;
  readonly allTab: string;
  readonly pickedUpTab: string;
  readonly washingTab: string;
  readonly ironingTab: string;
  readonly returnedTab: string;
  readonly expressOnlyTab: string;
  readonly advanceStageAction: string;
  readonly postToFolioAction: string;
  readonly postedStatusBadge: string;
  readonly pendingPostStatusBadge: string;
  readonly expressBadge: string;
  readonly piecesLabel: string;
  readonly grandTotalLabel: string;
  readonly bagTagLabel: string;
  readonly roomLabel: string;
  readonly readyByLabel: string;
  readonly specialCareNotice: string;
  readonly totalActiveJobs: string;
  readonly inWashing: string;
  readonly inIroning: string;
  readonly readyToReturn: string;
  readonly totalPostedRevenue: string;
  readonly postSuccessToast: string;
  readonly stageAdvancedToast: string;
  readonly closeAction: string;
  readonly drawerTitle: string;
}

const LAUNDRY_TRACKER_TRANSLATIONS: Record<SupportedLanguage, LaundryTrackerTranslations> = {
  en: {
    title: "Guest Laundry & Dry Cleaning Tracker",
    subtitle: "Real-Time Garment Processing & Folio Auto-Posting",
    searchPlaceholder: "Search room, guest name, or bag tag #...",
    allTab: "All Jobs",
    pickedUpTab: "Picked Up",
    washingTab: "Washing",
    ironingTab: "Ironing",
    returnedTab: "Returned to Room",
    expressOnlyTab: "⚡ Express Only",
    advanceStageAction: "Advance Stage",
    postToFolioAction: "Post to Folio",
    postedStatusBadge: "Posted to Folio",
    pendingPostStatusBadge: "Pending Folio Charge",
    expressBadge: "⚡ Express 4h",
    piecesLabel: "pcs",
    grandTotalLabel: "Chargeable Total",
    bagTagLabel: "Tag",
    roomLabel: "Room",
    readyByLabel: "Ready By",
    specialCareNotice: "Fabric Care Instruction",
    totalActiveJobs: "Active Jobs",
    inWashing: "In Wash",
    inIroning: "In Ironing",
    readyToReturn: "Ready to Return",
    totalPostedRevenue: "Folio Billed Revenue",
    postSuccessToast: "Laundry charge posted to room folio with 4-stage taxes!",
    stageAdvancedToast: "Laundry bag moved to next processing stage!",
    closeAction: "Close",
    drawerTitle: "Laundry Job Specification",
  },
  si: {
    title: "අමුත්තන්ගේ රෙදි සේදීමේ කළමනාකරණය",
    subtitle: "තත්‍ය කාලීන සේදුම් ක්‍රියාවලිය සහ බිල්පත් ගාස්තු",
    searchPlaceholder: "කාමර අංකය, අමුත්තාගේ නම හෝ ටැග් අංකය සොයන්න...",
    allTab: "සියල්ල",
    pickedUpTab: "භාරගත්",
    washingTab: "සේදීම",
    ironingTab: "ඉස්තිරික්ක කිරීම",
    returnedTab: "කාමරයට භාරදුන්",
    expressOnlyTab: "⚡ කඩිනම් පමණක්",
    advanceStageAction: "ඊළඟ පියවර",
    postToFolioAction: "ගිණුමට එක් කරන්න",
    postedStatusBadge: "ගිණුමට එක් කළා",
    pendingPostStatusBadge: "අය කිරීමට නියමිතයි",
    expressBadge: "⚡ පැය 4 කඩිනම්",
    piecesLabel: "ඇඳුම්",
    grandTotalLabel: "අය කළ යුතු එකතුව",
    bagTagLabel: "ටැගය",
    roomLabel: "කාමරය",
    readyByLabel: "සූදානම් වන වේලාව",
    specialCareNotice: "විශේෂ සත්කාර උපදෙස්",
    totalActiveJobs: "ක්‍රියාකාරී ඇණවුම්",
    inWashing: "සේදීමේ",
    inIroning: "ඉස්තිරික්කයේ",
    readyToReturn: "භාරදීමට සූදානම්",
    totalPostedRevenue: "අය කළ මුළු ආදායම",
    postSuccessToast: "රෙදි සේදුම් ගාස්තුව කාමර ගිණුමට සාර්ථකව එක් කරන ලදී!",
    stageAdvancedToast: "ඇඳුම් බෑගය ඊළඟ පියවරට යවන ලදී!",
    closeAction: "වසන්න",
    drawerTitle: "රෙදි සේදුම් ඇණවුම් විස්තර",
  },
  ta: {
    title: "விருந்தினர் சலவை & உலர் சலவை கண்காணிப்பு",
    subtitle: "நிகழ்நேர சலவை மேலாண்மை & அறை பில் சேர்த்தல்",
    searchPlaceholder: "அறை, பெயர் அல்லது குறிச்சொல் தேடுக...",
    allTab: "அனைத்தும்",
    pickedUpTab: "பெறப்பட்டது",
    washingTab: "கழுவுதல்",
    ironingTab: "இஸ்திரி",
    returnedTab: "அறைக்கு வழங்கப்பட்டது",
    expressOnlyTab: "⚡ விரைவு மட்டும்",
    advanceStageAction: "அடுத்த நிலை",
    postToFolioAction: "பில்லில் சேர்க்க",
    postedStatusBadge: "பில்லில் சேர்க்கப்பட்டது",
    pendingPostStatusBadge: "நிலுவையில்",
    expressBadge: "⚡ 4 மணி விரைவு",
    piecesLabel: "துணிகள்",
    grandTotalLabel: "மொத்த கட்டணம்",
    bagTagLabel: "குறிச்சொல்",
    roomLabel: "அறை",
    readyByLabel: "தயார் நேரம்",
    specialCareNotice: "சிறப்பு பராமரிப்பு குறிப்பு",
    totalActiveJobs: "செயலில் உள்ளவை",
    inWashing: "கழுவலில்",
    inIroning: "இஸ்திரியில்",
    readyToReturn: "வழங்க தயார்",
    totalPostedRevenue: "மொத்த வருவாய்",
    postSuccessToast: "சலவை கட்டணம் அறை கணக்கில் சேர்க்கப்பட்டது!",
    stageAdvancedToast: "சலவை அடுத்த நிலைக்கு நகர்த்தப்பட்டது!",
    closeAction: "மூடு",
    drawerTitle: "சலவை பணி விவரக்குறிப்பு",
  },
};

export function getLaundryTrackerText(lang: SupportedLanguage = "en"): LaundryTrackerTranslations {
  return LAUNDRY_TRACKER_TRANSLATIONS[lang] ?? LAUNDRY_TRACKER_TRANSLATIONS.en;
}

// ============================================================================
// Pure Statutory Tax & Pipeline Resolvers (Complexity <= 12)
// ============================================================================

export function calculateLaundryTaxes(
  items: readonly LaundryJobGarmentLine[],
  isExpress: boolean,
): LaundryJobFinancialSummary {
  let standardSubtotal = 0;
  let piecesCount = 0;

  for (const item of items) {
    standardSubtotal += item.lineTotalLkr;
    piecesCount += item.quantity;
  }

  // Express 4-Hour Turnaround has +50% Surcharge
  const expressSurchargeLkr = isExpress ? Math.round(standardSubtotal * 0.5 * 100) / 100 : 0;

  const netBaseLkr = Math.round((standardSubtotal + expressSurchargeLkr) * 100) / 100;

  // Stage 1: 10% Service Charge
  const scLkr = Math.round(netBaseLkr * 0.1 * 100) / 100;
  const afterSc = netBaseLkr + scLkr;

  // Stage 2: 1% Tourism Development Levy (TDL) on (Base + SC)
  const tdlLkr = Math.round(afterSc * 0.01 * 100) / 100;

  // Stage 3: 2.5% Social Security Contribution Levy (SSCL) on (Base + SC)
  const ssclLkr = Math.round(afterSc * 0.025 * 100) / 100;

  // Stage 4: 18% VAT on (Base + SC + SSCL)
  const vatBase = afterSc + ssclLkr;
  const vatLkr = Math.round(vatBase * 0.18 * 100) / 100;

  const grandTotalLkr = Math.round((afterSc + tdlLkr + ssclLkr + vatLkr) * 100) / 100;

  return {
    piecesCount,
    standardSubtotalLkr: Math.round(standardSubtotal * 100) / 100,
    isExpress,
    expressSurchargeLkr,
    netBaseLkr,
    scLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    grandTotalLkr,
  };
}

export function formatLaundryLkr(amount: number): string {
  return `LKR ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function getNextLaundryStage(current: LaundryJobStage): LaundryJobStage {
  switch (current) {
    case "PICKED_UP":
      return "WASHING";
    case "WASHING":
      return "IRONING";
    case "IRONING":
      return "RETURNED_TO_ROOM";
    case "RETURNED_TO_ROOM":
      return "RETURNED_TO_ROOM";
  }
}

export function resolveStageBadge(stage: LaundryJobStage): {
  readonly label: string;
  readonly style: string;
  readonly icon: string;
} {
  switch (stage) {
    case "PICKED_UP":
      return {
        label: "Picked Up",
        style: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: "🧺",
      };
    case "WASHING":
      return {
        label: "Washing",
        style: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        icon: "🧼",
      };
    case "IRONING":
      return {
        label: "Ironing",
        style: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: "👔",
      };
    case "RETURNED_TO_ROOM":
      return {
        label: "Delivered",
        style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: "✨",
      };
  }
}

export function isJobMatchingTab(job: LaundryJobRecord, activeTab: LaundryFilterTab): boolean {
  if (activeTab === "ALL") return true;
  if (activeTab === "EXPRESS_ONLY") return job.isExpress;
  return job.stage === activeTab;
}

export function isJobMatchingSearch(job: LaundryJobRecord, searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    job.roomNumber.toLowerCase().includes(q) ||
    job.guestName.toLowerCase().includes(q) ||
    job.bagTagNumber.toLowerCase().includes(q)
  );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface TrackerHeaderProps {
  readonly propertyName: string;
  readonly t: LaundryTrackerTranslations;
}

const TrackerHeader: FC<TrackerHeaderProps> = ({ propertyName, t }) => {
  return (
    <div className="border-b border-white/10 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          {propertyName}
        </span>
        <span className="text-xs text-slate-400">Housekeeping Laundry Department</span>
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">{t.title}</h1>
      <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
    </div>
  );
};

interface MetricsBarProps {
  readonly jobs: readonly LaundryJobRecord[];
  readonly t: LaundryTrackerTranslations;
}

const MetricsBar: FC<MetricsBarProps> = ({ jobs, t }) => {
  let activeCount = 0;
  let inWashCount = 0;
  let inIronCount = 0;
  let readyReturnCount = 0;
  let billedRevenueLkr = 0;

  for (const job of jobs) {
    if (job.stage !== "RETURNED_TO_ROOM") {
      activeCount += 1;
    }
    if (job.stage === "WASHING") inWashCount += 1;
    if (job.stage === "IRONING") inIronCount += 1;
    if (job.stage === "RETURNED_TO_ROOM" && job.postingStatus === "PENDING_POST") {
      readyReturnCount += 1;
    }
    if (job.postingStatus === "POSTED_TO_FOLIO") {
      billedRevenueLkr += job.financialSummary.grandTotalLkr;
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.totalActiveJobs}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-white mt-1 block">
          {activeCount}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.inWashing}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-400 mt-1 block">
          {inWashCount}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.inIroning}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-purple-400 mt-1 block">
          {inIronCount}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.readyToReturn}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-blue-400 mt-1 block">
          {readyReturnCount}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.totalPostedRevenue}</span>
        <span className="text-lg font-bold font-mono tabular-nums-lkr text-emerald-400 mt-1 block truncate">
          {formatLaundryLkr(billedRevenueLkr)}
        </span>
      </div>
    </div>
  );
};

interface FilterBarProps {
  readonly activeTab: LaundryFilterTab;
  readonly onSelectTab: (tab: LaundryFilterTab) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly t: LaundryTrackerTranslations;
}

const FilterBar: FC<FilterBarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  t,
}) => {
  const searchId = useId();

  const tabs: Array<{ id: LaundryFilterTab; label: string; icon: string }> = [
    { id: "ALL", label: t.allTab, icon: "📋" },
    { id: "PICKED_UP", label: t.pickedUpTab, icon: "🧺" },
    { id: "WASHING", label: t.washingTab, icon: "🧼" },
    { id: "IRONING", label: t.ironingTab, icon: "👔" },
    { id: "RETURNED_TO_ROOM", label: t.returnedTab, icon: "✨" },
    { id: "EXPRESS_ONLY", label: t.expressOnlyTab, icon: "⚡" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-blue-500 text-white shadow-md font-bold"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-[240px]">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <input
          id={searchId}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
        />
      </div>
    </div>
  );
};

interface JobCardProps {
  readonly job: LaundryJobRecord;
  readonly t: LaundryTrackerTranslations;
  readonly onAdvance: (jobId: string, nextStage: LaundryJobStage) => void;
  readonly onPost: (job: LaundryJobRecord) => void;
  readonly onInspect: (job: LaundryJobRecord) => void;
}

const JobCard: FC<JobCardProps> = ({ job, t, onAdvance, onPost, onInspect }) => {
  const stageBadge = resolveStageBadge(job.stage);
  const nextStage = getNextLaundryStage(job.stage);
  const canAdvance = job.stage !== "RETURNED_TO_ROOM";
  const canPost = job.postingStatus === "PENDING_POST";

  return (
    <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/10 apple-liquid-glass space-y-3 shadow-lg hover:border-white/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-white tracking-tight">
              Room #{job.roomNumber}
            </span>
            <span className="font-mono text-xs text-slate-400">({job.bagTagNumber})</span>
            {job.isExpress && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                {t.expressBadge}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-300 block">{job.guestName}</span>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider ${stageBadge.style}`}
        >
          <span>{stageBadge.icon}</span>
          <span>{stageBadge.label}</span>
        </span>
      </div>

      {/* Garments summary line */}
      <div className="text-xs text-slate-400 flex items-center justify-between">
        <span>
          {job.financialSummary.piecesCount} {t.piecesLabel} (
          {job.items
            .map((i) => i.garmentName)
            .slice(0, 2)
            .join(", ")}
          )
        </span>
        <button
          type="button"
          onClick={() => onInspect(job)}
          className="text-blue-400 hover:text-blue-300 font-semibold text-[11px] underline underline-offset-2"
        >
          View Checklist
        </button>
      </div>

      {/* Special Care Alert */}
      {job.specialCareNotes && (
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-start gap-1.5">
          <span>ℹ️</span>
          <span className="truncate">{job.specialCareNotes}</span>
        </div>
      )}

      {/* Price & Ready Time */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 block">{t.readyByLabel}</span>
          <span className="text-xs font-mono text-slate-300">
            {new Date(job.estimatedReadyTimeIso).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 block">{t.grandTotalLabel}</span>
          <span className="text-sm font-black font-mono tabular-nums-lkr text-emerald-400">
            {formatLaundryLkr(job.financialSummary.grandTotalLkr)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAdvance(job.jobId, nextStage)}
          disabled={!canAdvance}
          className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
            canAdvance
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
              : "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
          }`}
        >
          <span>⏩</span>
          <span className="truncate">{t.advanceStageAction}</span>
        </button>

        <button
          type="button"
          onClick={() => onPost(job)}
          disabled={!canPost}
          className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
            canPost
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
          }`}
        >
          <span>{canPost ? "⚡" : "✓"}</span>
          <span className="truncate">{canPost ? t.postToFolioAction : t.postedStatusBadge}</span>
        </button>
      </div>
    </div>
  );
};

interface JobDetailsDrawerProps {
  readonly job: LaundryJobRecord | null;
  readonly t: LaundryTrackerTranslations;
  readonly onClose: () => void;
}

const JobDetailsDrawer: FC<JobDetailsDrawerProps> = ({ job, t, onClose }) => {
  if (!job) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="job-details-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
    >
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/10 apple-liquid-glass p-5 space-y-4 shadow-2xl overflow-y-auto">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
              {job.bagTagNumber} • Folio: {job.folioId}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Room #{job.roomNumber} ({job.guestName})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-slate-300"
            aria-label={t.closeAction}
          >
            ✕
          </button>
        </div>

        {/* Itemized Garment Lines */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Garment Checklist
          </span>
          <div className="space-y-1.5">
            {job.items.map((line) => (
              <div
                key={line.id}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white block">{line.garmentName}</span>
                  <span className="text-[10px] text-slate-400">{line.serviceType}</span>
                </div>
                <div className="text-right font-mono tabular-nums-lkr">
                  <span className="text-slate-300 block">
                    {line.quantity}x @ {formatLaundryLkr(line.unitPriceLkr)}
                  </span>
                  <span className="font-bold text-amber-400">
                    {formatLaundryLkr(line.lineTotalLkr)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Stage Sri Lankan Tax Breakdown */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Garment Subtotal</span>
            <span className="font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.standardSubtotalLkr)}
            </span>
          </div>

          {job.financialSummary.isExpress && (
            <div className="flex justify-between text-amber-300">
              <span>Express 4-Hour Surcharge (+50%)</span>
              <span className="font-mono tabular-nums-lkr">
                {formatLaundryLkr(job.financialSummary.expressSurchargeLkr)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-400">
            <span>Service Charge (10%)</span>
            <span className="font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.scLkr)}
            </span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Tourism Dev Levy (1%)</span>
            <span className="font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.tdlLkr)}
            </span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>SSCL (2.5%)</span>
            <span className="font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.ssclLkr)}
            </span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>VAT (18%)</span>
            <span className="font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.vatLkr)}
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-bold text-white">
            <span>Total Chargeable</span>
            <span className="text-base text-emerald-400 font-mono tabular-nums-lkr">
              {formatLaundryLkr(job.financialSummary.grandTotalLkr)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] rounded-2xl bg-white/15 hover:bg-white/20 text-white font-bold transition-all"
        >
          {t.closeAction}
        </button>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main View Component
// ============================================================================

export const LaundryTrackerView: FC<LaundryTrackerViewProps> = ({
  tenantId: _tenantId = "cinnamon-wild-yala",
  propertyName = "Cinnamon Wild Yala",
  initialJobs = DEFAULT_LAUNDRY_JOBS,
  language = "en",
  onPostToFolio,
  onStageChange,
}) => {
  const t = getLaundryTrackerText(language);

  const [jobs, setJobs] = useState<readonly LaundryJobRecord[]>(initialJobs);
  const [activeTab, setActiveTab] = useState<LaundryFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectedJob, setInspectedJob] = useState<LaundryJobRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(
      (job) => isJobMatchingTab(job, activeTab) && isJobMatchingSearch(job, searchQuery),
    );
  }, [jobs, activeTab, searchQuery]);

  const handleAdvanceStage = async (jobId: string, nextStage: LaundryJobStage) => {
    setJobs((prev) =>
      prev.map((job) => (job.jobId === jobId ? { ...job, stage: nextStage } : job)),
    );

    playOrderBell("NEW_ORDER");
    setToastMessage(t.stageAdvancedToast);
    setTimeout(() => setToastMessage(null), 3000);

    if (onStageChange) {
      await onStageChange(jobId, nextStage);
    }
  };

  const handlePostToFolio = async (job: LaundryJobRecord) => {
    setJobs((prev) =>
      prev.map((j) => (j.jobId === job.jobId ? { ...j, postingStatus: "POSTED_TO_FOLIO" } : j)),
    );

    playOrderBell("PAYMENT_CONFIRMED");
    setToastMessage(t.postSuccessToast);
    setTimeout(() => setToastMessage(null), 3500);

    if (onPostToFolio) {
      await onPostToFolio(job);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <TrackerHeader propertyName={propertyName} t={t} />

      {/* Metrics Bar */}
      <MetricsBar jobs={jobs} t={t} />

      {/* Filter Tabs & Search */}
      <FilterBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        t={t}
      />

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredJobs.map((job) => (
          <JobCard
            key={job.jobId}
            job={job}
            t={t}
            onAdvance={handleAdvanceStage}
            onPost={handlePostToFolio}
            onInspect={setInspectedJob}
          />
        ))}

        {filteredJobs.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-white/5 rounded-3xl border border-white/10">
            No laundry jobs matching the current filter.
          </div>
        )}
      </div>

      {/* Details Slide-Over Drawer */}
      <JobDetailsDrawer job={inspectedJob} t={t} onClose={() => setInspectedJob(null)} />
    </div>
  );
};
