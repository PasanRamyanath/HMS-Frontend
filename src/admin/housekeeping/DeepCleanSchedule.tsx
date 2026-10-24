import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Room Deep-Cleaning & Monsoon Mold/Fumigation Schedule Tracker (DeepCleanSchedule.tsx)
 *
 * Housekeeping Operations & Asset Protection component for Sri Lankan luxury resorts & villas.
 * Tracks periodic preventive maintenance cycles across high-humidity coastal and highland zones:
 * - Monsoon Anti-Fungal Fogging & Teak Wood Sealant
 * - Split-Unit AC Chemical Coil Flush & Blower Wheel Sanitization
 * - High-Temperature Mattress Steam Extraction & UV Allergen Treatment
 * - Hard-Water Bathroom Grout & Tile Descaling
 * - Mosquito, Termite & Pest Perimeter Fumigation
 *
 * Operational Capabilities:
 * - Days-since-last-service calculation with dynamic overdue alert thresholds
 * - 1-Tap "Log Deep Clean Treatment" modal sheet with technician & contractor log
 * - Multi-category room filtering (All, Overdue, Due Soon, In Progress, Healthy)
 * - Financial cost aggregation in .tabular-nums-lkr
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict >= 44x44pt touch targets, .apple-liquid-glass, and cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DeepCleanServiceType =
  | "AC_CHEMICAL_FLUSH"
  | "MOLD_FOLIAGE_FOGGING"
  | "MATTRESS_STEAM_UV"
  | "GROUT_DESCALING"
  | "PEST_FUMIGATION";

export type DeepCleanStatus = "HEALTHY" | "DUE_SOON" | "OVERDUE" | "IN_PROGRESS";

export type DeepCleanFilterTab = "ALL" | DeepCleanStatus;

export interface RoomDeepCleanRecord {
  readonly roomId: string;
  readonly roomNumber: string;
  readonly roomCategory: string;
  readonly floor: string;
  readonly lastServiceDateIso: string;
  readonly daysSinceLastService: number;
  readonly serviceType: DeepCleanServiceType;
  readonly status: DeepCleanStatus;
  readonly technicianName: string;
  readonly nextScheduledDateIso?: string | undefined;
  readonly notes?: string | undefined;
  readonly serviceCostLkr: number;
}

export interface DeepCleanSummaryMetrics {
  readonly totalRooms: number;
  readonly overdueCount: number;
  readonly dueSoonCount: number;
  readonly inProgressCount: number;
  readonly healthyCount: number;
  readonly complianceRatePct: number;
  readonly totalMaintenanceCostLkr: number;
}

export interface DeepCleanScheduleProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly initialRecords?: readonly RoomDeepCleanRecord[] | undefined;
  readonly onSaveTreatment?:
    | ((
        roomId: string,
        serviceType: DeepCleanServiceType,
        technician: string,
        costLkr: number,
        notes: string,
      ) => Promise<void> | void)
    | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_DEEP_CLEAN_RECORDS: readonly RoomDeepCleanRecord[] = [
  {
    roomId: "dc-101",
    roomNumber: "Villa 101",
    roomCategory: "Oceanfront Private Pool Villa",
    floor: "Ground",
    lastServiceDateIso: "2026-07-15T00:00:00Z",
    daysSinceLastService: 97,
    serviceType: "MOLD_FOLIAGE_FOGGING",
    status: "OVERDUE",
    technicianName: "Lanka Pest & Mold Solutions",
    nextScheduledDateIso: "2026-10-21T00:00:00Z",
    notes: "Southwest monsoon moisture on outdoor teak daybed and ceiling beams.",
    serviceCostLkr: 18500,
  },
  {
    roomId: "dc-102",
    roomNumber: "Room 102",
    roomCategory: "Deluxe Ocean View",
    floor: "1st Floor",
    lastServiceDateIso: "2026-08-10T00:00:00Z",
    daysSinceLastService: 71,
    serviceType: "AC_CHEMICAL_FLUSH",
    status: "DUE_SOON",
    technicianName: "Southern Cool Engineers",
    notes: "Inverter AC filter cleaned, full chemical coil flush scheduled for this week.",
    serviceCostLkr: 12000,
  },
  {
    roomId: "dc-103",
    roomNumber: "Villa 103",
    roomCategory: "Garden Villa",
    floor: "Ground",
    lastServiceDateIso: "2026-09-28T00:00:00Z",
    daysSinceLastService: 22,
    serviceType: "MATTRESS_STEAM_UV",
    status: "HEALTHY",
    technicianName: "Housekeeping Deep Clean Team",
    notes: "King mattress 180°C steam extraction and UV sanitization completed.",
    serviceCostLkr: 8500,
  },
  {
    roomId: "dc-104",
    roomNumber: "Room 104",
    roomCategory: "Superior Twin",
    floor: "1st Floor",
    lastServiceDateIso: "2026-07-02T00:00:00Z",
    daysSinceLastService: 110,
    serviceType: "GROUT_DESCALING",
    status: "OVERDUE",
    technicianName: "Coastal Tile Restorations",
    notes: "Hard water calcium buildup around rain shower and outdoor jacuzzi jets.",
    serviceCostLkr: 14000,
  },
  {
    roomId: "dc-105",
    roomNumber: "Villa 105",
    roomCategory: "Royal Honeymoon Suite",
    floor: "Ground",
    lastServiceDateIso: "2026-10-18T00:00:00Z",
    daysSinceLastService: 2,
    serviceType: "PEST_FUMIGATION",
    status: "IN_PROGRESS",
    technicianName: "Ceylon Pest Control",
    notes: "Quarterly perimeter barrier fogging against coastal sand flies and mosquitoes.",
    serviceCostLkr: 16500,
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface DeepCleanTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly searchPlaceholder: string;
  readonly allTab: string;
  readonly overdueTab: string;
  readonly dueSoonTab: string;
  readonly inProgressTab: string;
  readonly healthyTab: string;
  readonly totalRoomsLabel: string;
  readonly overdueLabel: string;
  readonly dueSoonLabel: string;
  readonly complianceRateLabel: string;
  readonly totalExpenditureLabel: string;
  readonly lastServiceLabel: string;
  readonly daysElapsedLabel: string;
  readonly contractorLabel: string;
  readonly serviceCostLabel: string;
  readonly logTreatmentAction: string;
  readonly modalTitle: string;
  readonly modalSubtitle: string;
  readonly serviceTypeLabel: string;
  readonly technicianLabel: string;
  readonly costLabel: string;
  readonly notesLabel: string;
  readonly notesPlaceholder: string;
  readonly cancelAction: string;
  readonly saveAction: string;
  readonly successToast: string;
  readonly acService: string;
  readonly moldService: string;
  readonly mattressService: string;
  readonly groutService: string;
  readonly pestService: string;
}

const DEEP_CLEAN_TRANSLATIONS: Record<SupportedLanguage, DeepCleanTranslations> = {
  en: {
    title: "Deep-Cleaning & Monsoon Maintenance Tracker",
    subtitle: "Tropical Resort Asset Health, Mold Remediation & AC Servicing Cycles",
    searchPlaceholder: "Search room #, category, or technician...",
    allTab: "All Rooms",
    overdueTab: "Overdue (>75 Days)",
    dueSoonTab: "Due Soon (45-75 Days)",
    inProgressTab: "In Progress",
    healthyTab: "Compliant (<45 Days)",
    totalRoomsLabel: "Tracked Rooms",
    overdueLabel: "Overdue Attention",
    dueSoonLabel: "Due Soon",
    complianceRateLabel: "Cycle Compliance",
    totalExpenditureLabel: "Maintenance Total",
    lastServiceLabel: "Last Deep Clean",
    daysElapsedLabel: "Days Elapsed",
    contractorLabel: "Technician / Contractor",
    serviceCostLabel: "Service Cost",
    logTreatmentAction: "Log Treatment",
    modalTitle: "Log Deep-Cleaning Treatment",
    modalSubtitle: "Record completed preventive cycle and reset maintenance clock.",
    serviceTypeLabel: "Maintenance Service Type",
    technicianLabel: "Technician or Contractor Name",
    costLabel: "Expenditure (LKR)",
    notesLabel: "Service Notes & Observations",
    notesPlaceholder: "Document chemical treatments, filter replacements, or teak polish...",
    cancelAction: "Cancel",
    saveAction: "Save & Reset Clock",
    successToast: "Treatment recorded; room maintenance clock reset!",
    acService: "AC Chemical Coil Flush",
    moldService: "Monsoon Mold Fogging & Teak Polish",
    mattressService: "Mattress High-Temp Steam & UV",
    groutService: "Bathroom Grout & Descaling",
    pestService: "Perimeter Pest & Mosquito Fumigation",
  },
  si: {
    title: "ගැඹුරු පිරිසිදු කිරීම් සහ මෝසම් නඩත්තු සටහන",
    subtitle: "හෝටල් කාමර කල්පැවැත්ම, පුස් නාශනය සහ වායු සමීකරණ නඩත්තු චක්රය",
    searchPlaceholder: "කාමර අංකය, වර්ගය හෝ කාර්මිකයා සොයන්න...",
    allTab: "සියල්ල",
    overdueTab: "ප්රමාද වූ (>දින 75)",
    dueSoonTab: "ළඟදීම අවශ්ය (දින 45-75)",
    inProgressTab: "සිදුවෙමින් පවතී",
    healthyTab: "නියමිත පරිදි (<දින 45)",
    totalRoomsLabel: "මුළු කාමර",
    overdueLabel: "ප්රමාද කාමර",
    dueSoonLabel: "ළඟදීම නියමිත",
    complianceRateLabel: "අනුකූලතා ප්රතිශතය",
    totalExpenditureLabel: "නඩත්තු පිරිවැය",
    lastServiceLabel: "අවසන් නඩත්තුව",
    daysElapsedLabel: "ගතවූ දින ගණන",
    contractorLabel: "කාර්මිකයා / ආයතනය",
    serviceCostLabel: "සේවා ගාස්තුව",
    logTreatmentAction: "නඩත්තුව සටහන් කරන්න",
    modalTitle: "ගැඹුරු නඩත්තු ප්රතිකාරය සටහන් කරන්න",
    modalSubtitle: "නඩත්තු කටයුතු තහවුරු කර දින ගණකය යළි පිහිටුවන්න.",
    serviceTypeLabel: "නඩත්තු සේවා වර්ගය",
    technicianLabel: "කාර්මිකයාගේ නම",
    costLabel: "පිරිවැය (LKR)",
    notesLabel: "විශේෂ සටහන්",
    notesPlaceholder: "භාවිත කළ රසායන ද්රව්ය සහ වෙනත් විස්තර...",
    cancelAction: "අවලංගු කරන්න",
    saveAction: "සුරකින්න",
    successToast: "නඩත්තුව සාර්ථකව සටහන් විය!",
    acService: "වායු සමීකරණ රසායනික සේදීම",
    moldService: "පුස් නාශනය සහ තේක්ක ලී ආලේපනය",
    mattressService: "මෙට්ට හුමාල සහ UV විෂබීජ නාශනය",
    groutService: "නානකාමර ටයිල් කැල්සියම් ඉවත් කිරීම",
    pestService: "මදුරු සහ කෘමි මර්දන දුමාරය",
  },
  ta: {
    title: "ஆழமான தூய்மைப்படுத்தல் & மழைக்கால பராமரிப்பு",
    subtitle: "அறை சொத்து பாதுகாப்பு, பூஞ்சை கட்டுப்பாடு மற்றும் ஏசி பராமரிப்பு",
    searchPlaceholder: "அறை எண், வகை தேடுக...",
    allTab: "அனைத்தும்",
    overdueTab: "தாமதமானவை (>75 நாட்கள்)",
    dueSoonTab: "விரைவில் தேவை (45-75)",
    inProgressTab: "செயல்பாட்டில்",
    healthyTab: "சரியான நிலை (<45 நாட்கள்)",
    totalRoomsLabel: "மொத்த அறைகள்",
    overdueLabel: "தாமதமான அறைகள்",
    dueSoonLabel: "விரைவில் தேவை",
    complianceRateLabel: "இணக்க விகிதம்",
    totalExpenditureLabel: "மொத்த செலவு",
    lastServiceLabel: "கடைசி பராமரிப்பு",
    daysElapsedLabel: "கடந்த நாட்கள்",
    contractorLabel: "தொழில்நுட்ப நிபுணர்",
    serviceCostLabel: "சேவை கட்டணம்",
    logTreatmentAction: "பராமரிப்பை பதிவு செய்",
    modalTitle: "ஆழமான தூய்மை பராமரிப்பு பதிவு",
    modalSubtitle: "பராமரிப்பு காலக்கட்டத்தை புதுப்பிக்கவும்.",
    serviceTypeLabel: "பராமரிப்பு சேவை வகை",
    technicianLabel: "தொழில்நுட்ப நிபுணர் பெயர்",
    costLabel: "செலவு (LKR)",
    notesLabel: "குறிப்புகள்",
    notesPlaceholder: "பயன்படுத்தப்பட்ட இரசாயனங்கள் மற்றும் குறிப்புகள்...",
    cancelAction: "ரத்து செய்",
    saveAction: "சேமி",
    successToast: "பராமரிப்பு வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!",
    acService: "ஏசி இரசாயன சுத்தம்",
    moldService: "மழைக்கால பூஞ்சை நீக்கம் & தேக்கு பாலிஷ்",
    mattressService: "மெத்தை நீராவி & UV சிகிச்சை",
    groutService: "குளியலறை டைல்ஸ் சுத்தம்",
    pestService: "கொசு மற்றும் பூச்சி புகை மருந்து",
  },
};

export function getDeepCleanText(lang: SupportedLanguage = "en"): DeepCleanTranslations {
  return DEEP_CLEAN_TRANSLATIONS[lang] ?? DEEP_CLEAN_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function formatDeepCleanLkr(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0";
  return `Rs. ${Math.round(amount).toLocaleString("en-LK")}`;
}

export function evaluateDeepCleanStatus(daysSince: number): DeepCleanStatus {
  if (daysSince > 75) return "OVERDUE";
  if (daysSince >= 45) return "DUE_SOON";
  return "HEALTHY";
}

export function calculateDeepCleanSummary(
  records: readonly RoomDeepCleanRecord[],
): DeepCleanSummaryMetrics {
  let overdueCount = 0;
  let dueSoonCount = 0;
  let inProgressCount = 0;
  let healthyCount = 0;
  let totalMaintenanceCostLkr = 0;

  for (const r of records) {
    totalMaintenanceCostLkr += r.serviceCostLkr;

    switch (r.status) {
      case "OVERDUE":
        overdueCount += 1;
        break;
      case "DUE_SOON":
        dueSoonCount += 1;
        break;
      case "IN_PROGRESS":
        inProgressCount += 1;
        break;
      case "HEALTHY":
        healthyCount += 1;
        break;
    }
  }

  const totalRooms = records.length;
  const compliantCount = healthyCount + inProgressCount;
  const complianceRatePct =
    totalRooms > 0 ? Math.round((compliantCount / totalRooms) * 1000) / 10 : 0;

  return {
    totalRooms,
    overdueCount,
    dueSoonCount,
    inProgressCount,
    healthyCount,
    complianceRatePct,
    totalMaintenanceCostLkr: Math.round((totalMaintenanceCostLkr + Number.EPSILON) * 100) / 100,
  };
}

export function resolveServiceTypeBadge(
  type: DeepCleanServiceType,
  t?: DeepCleanTranslations,
): { readonly label: string; readonly icon: string; readonly style: string } {
  switch (type) {
    case "AC_CHEMICAL_FLUSH":
      return {
        label: t ? t.acService : "AC Chemical Coil Flush",
        icon: "AC",
        style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      };
    case "MOLD_FOLIAGE_FOGGING":
      return {
        label: t ? t.moldService : "Monsoon Mold Fogging",
        icon: "Eco",
        style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
      };
    case "MATTRESS_STEAM_UV":
      return {
        label: t ? t.mattressService : "Mattress Steam & UV",
        icon: "Room",
        style: "bg-purple-500/20 text-purple-800 border-purple-500/30",
      };
    case "GROUT_DESCALING":
      return {
        label: t ? t.groutService : "Bathroom Grout Descaling",
        icon: "Shower",
        style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
      };
    case "PEST_FUMIGATION":
      return {
        label: t ? t.pestService : "Pest & Mosquito Fumigation",
        icon: "Pest",
        style: "bg-rose-500/20 text-rose-800 border-rose-500/30",
      };
  }
}

export function resolveDeepCleanStatusBadge(status: DeepCleanStatus): {
  readonly label: string;
  readonly icon: string;
  readonly style: string;
} {
  switch (status) {
    case "OVERDUE":
      return {
        label: "Overdue Treatment",
        icon: "Alert",
        style: "bg-rose-500/20 text-rose-800 border-rose-500/40 animate-pulse",
      };
    case "DUE_SOON":
      return {
        label: "Due Soon",
        icon: "Wait",
        style: "bg-amber-500/20 text-amber-800 border-amber-500/40",
      };
    case "IN_PROGRESS":
      return {
        label: "Maintenance Active",
        icon: "Fix",
        style: "bg-blue-500/20 text-blue-800 border-blue-500/40",
      };
    case "HEALTHY":
      return {
        label: "Compliant & Fresh",
        icon: "Clean",
        style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40",
      };
  }
}

export function isRecordMatchingFilter(
  rec: RoomDeepCleanRecord,
  tab: DeepCleanFilterTab,
  query: string,
): boolean {
  if (tab !== "ALL" && rec.status !== tab) return false;

  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;

  return (
    rec.roomNumber.toLowerCase().includes(q) ||
    rec.roomCategory.toLowerCase().includes(q) ||
    rec.technicianName.toLowerCase().includes(q) ||
    (rec.notes?.toLowerCase().includes(q) ?? false)
  );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface MetricsBarProps {
  readonly summary: DeepCleanSummaryMetrics;
  readonly t: DeepCleanTranslations;
}

const DeepCleanMetricsBar: FC<MetricsBarProps> = ({ summary, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
        <span className="text-[11px] text-slate-500 block font-medium">{t.totalRoomsLabel}</span>
        <span className="text-xl font-bold text-slate-900 tabular-nums-lkr">
          {summary.totalRooms}
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-rose-500/20">
        <span className="text-[11px] text-rose-800/70 block font-medium">{t.overdueLabel}</span>
        <span className="text-xl font-bold text-rose-800 tabular-nums-lkr">
          {summary.overdueCount}
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-emerald-500/20">
        <span className="text-[11px] text-[#0B6E4F]/70 block font-medium">
          {t.complianceRateLabel}
        </span>
        <span className="text-xl font-bold text-[#0B6E4F] tabular-nums-lkr">
          {summary.complianceRatePct}%
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
        <span className="text-[11px] text-slate-500 block font-medium">
          {t.totalExpenditureLabel}
        </span>
        <span className="text-lg font-bold text-amber-800 tabular-nums-lkr truncate block">
          {formatDeepCleanLkr(summary.totalMaintenanceCostLkr)}
        </span>
      </div>
    </div>
  );
};

interface RoomCardProps {
  readonly record: RoomDeepCleanRecord;
  readonly t: DeepCleanTranslations;
  readonly onOpenTreatment: (rec: RoomDeepCleanRecord) => void;
}

const DeepCleanRoomCard: FC<RoomCardProps> = ({ record, t, onOpenTreatment }) => {
  const serviceBadge = resolveServiceTypeBadge(record.serviceType, t);
  const statusBadge = resolveDeepCleanStatusBadge(record.status);

  return (
    <div className="apple-liquid-glass rounded-2xl p-4 border border-[#E2E8F0] hover:border-[#E2E8F0] transition-all flex flex-col justify-between gap-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-slate-900 block tracking-tight">
            {record.roomNumber}
          </span>
          <span className="text-xs text-slate-500">{record.roomCategory}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${statusBadge.style}`}
        >
          <span>
            <DynamicTokenIcon token={statusBadge.icon} />
          </span>
          <span>{statusBadge.label}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${serviceBadge.style}`}
        >
          <span>
            <DynamicTokenIcon token={serviceBadge.icon} />
          </span>
          <span>{serviceBadge.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-[#E2E8F0]">
        <div>
          <span className="text-slate-500 block font-medium">{t.daysElapsedLabel}</span>
          <span
            className={`font-bold tabular-nums-lkr text-sm ${
              record.daysSinceLastService > 75
                ? "text-rose-800"
                : record.daysSinceLastService >= 45
                  ? "text-amber-800"
                  : "text-[#0B6E4F]"
            }`}
          >
            {record.daysSinceLastService} Days Ago
          </span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">{t.serviceCostLabel}</span>
          <span className="font-semibold text-slate-900 tabular-nums-lkr text-sm">
            {formatDeepCleanLkr(record.serviceCostLkr)}
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-700">
        <span className="text-slate-500 font-medium">{t.contractorLabel}: </span>
        <span className="text-slate-900 font-medium">{record.technicianName}</span>
      </div>

      {record.notes && (
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic border border-[#E2E8F0]">
          "{record.notes}"
        </div>
      )}

      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end">
        <button
          type="button"
          onClick={() => onOpenTreatment(record)}
          className="bg-[#0B6E4F] min-h-[44px] min-w-[44px] px-4 py-2 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          <span>{t.logTreatmentAction}</span>
        </button>
      </div>
    </div>
  );
};

interface LogModalProps {
  readonly record: RoomDeepCleanRecord | null;
  readonly t: DeepCleanTranslations;
  readonly onClose: () => void;
  readonly onSave: (
    serviceType: DeepCleanServiceType,
    technician: string,
    costLkr: number,
    notes: string,
  ) => void;
}

const LogTreatmentModal: FC<LogModalProps> = ({ record, t, onClose, onSave }) => {
  if (!record) return null;

  const selectId = useId();
  const techId = useId();
  const costId = useId();
  const notesId = useId();

  const [serviceType, setServiceType] = useState<DeepCleanServiceType>(record.serviceType);
  const [technician, setTechnician] = useState(record.technicianName);
  const [costLkr, setCostLkr] = useState(record.serviceCostLkr.toString());
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = Number.parseFloat(costLkr) || 0;
    onSave(serviceType, technician, numCost, notes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="apple-liquid-glass rounded-2xl p-6 border border-[#E2E8F0] w-full max-w-lg shadow-2xl text-white">
        <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-lg font-bold tracking-tight">
              {t.modalTitle} — {record.roomNumber}
            </h3>
            <p className="text-xs text-slate-500">{t.modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-full bg-slate-50 hover:bg-slate-50"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1">
              {t.serviceTypeLabel}
            </label>
            <select
              id={selectId}
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as DeepCleanServiceType)}
              className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 min-h-[44px]"
            >
              <option value="AC_CHEMICAL_FLUSH">{t.acService}</option>
              <option value="MOLD_FOLIAGE_FOGGING">{t.moldService}</option>
              <option value="MATTRESS_STEAM_UV">{t.mattressService}</option>
              <option value="GROUT_DESCALING">{t.groutService}</option>
              <option value="PEST_FUMIGATION">{t.pestService}</option>
            </select>
          </div>

          <div>
            <label htmlFor={techId} className="block text-xs font-semibold text-slate-700 mb-1">
              {t.technicianLabel}
            </label>
            <input
              id={techId}
              type="text"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 min-h-[44px]"
              required
            />
          </div>

          <div>
            <label htmlFor={costId} className="block text-xs font-semibold text-slate-700 mb-1">
              {t.costLabel}
            </label>
            <input
              id={costId}
              type="number"
              min="0"
              value={costLkr}
              onChange={(e) => setCostLkr(e.target.value)}
              className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 min-h-[44px] tabular-nums-lkr"
              required
            />
          </div>

          <div>
            <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
              {t.notesLabel}
            </label>
            <textarea
              id={notesId}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 bg-slate-50 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-medium transition-all"
            >
              {t.cancelAction}
            </button>
            <button
              type="submit"
              className="bg-[#0B6E4F] min-h-[44px] px-5 py-2 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
            >
              {t.saveAction}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// Main DeepCleanSchedule Component
// ============================================================================

export const DeepCleanSchedule: FC<DeepCleanScheduleProps> = ({
  propertyTitle = "Sri Lanka Luxury Boutique Villas",
  language = "en",
  initialRecords = DEFAULT_DEEP_CLEAN_RECORDS,
  onSaveTreatment,
}) => {
  const t = useMemo(() => getDeepCleanText(language), [language]);
  const [records, setRecords] = useState<readonly RoomDeepCleanRecord[]>(initialRecords);
  const [activeTab, setActiveTab] = useState<DeepCleanFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRecord, setActiveRecord] = useState<RoomDeepCleanRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const summary = useMemo(() => calculateDeepCleanSummary(records), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => isRecordMatchingFilter(rec, activeTab, searchQuery));
  }, [records, activeTab, searchQuery]);

  const handleSaveTreatment = async (
    serviceType: DeepCleanServiceType,
    technician: string,
    costLkr: number,
    notes: string,
  ) => {
    if (!activeRecord) return;

    const roomId = activeRecord.roomId;
    if (onSaveTreatment) {
      await onSaveTreatment(roomId, serviceType, technician, costLkr, notes);
    }

    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.roomId !== roomId) return rec;
        return {
          ...rec,
          daysSinceLastService: 0,
          status: "HEALTHY",
          serviceType,
          technicianName: technician,
          serviceCostLkr: costLkr,
          lastServiceDateIso: new Date().toISOString(),
          notes: notes.trim().length > 0 ? notes : rec.notes,
        };
      }),
    );

    setActiveRecord(null);
    setToastMessage(t.successToast);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 border border-emerald-400/30">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="apple-liquid-glass rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div>
          <span className="text-slate-500 text-xs block font-medium">{propertyTitle}</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-black/30 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#E2E8F0] min-h-[44px]"
          />
        </div>
      </div>

      {/* Metrics Bar */}
      <DeepCleanMetricsBar summary={summary} t={t} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ALL"
              ? "bg-white text-black font-bold shadow"
              : "apple-liquid-glass text-slate-700 hover:text-slate-900"
          }`}
        >
          {t.allTab} ({summary.totalRooms})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("OVERDUE")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "OVERDUE"
              ? "bg-rose-500 text-white font-bold shadow"
              : "bg-rose-500/10 text-rose-800 hover:bg-rose-500/20"
          }`}
        >
          {t.overdueTab} ({summary.overdueCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("DUE_SOON")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "DUE_SOON"
              ? "bg-amber-500 text-black font-bold shadow"
              : "bg-amber-500/10 text-amber-800 hover:bg-amber-500/20"
          }`}
        >
          {t.dueSoonTab} ({summary.dueSoonCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("IN_PROGRESS")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "IN_PROGRESS"
              ? "bg-blue-500 text-white font-bold shadow"
              : "bg-blue-500/10 text-blue-800 hover:bg-blue-500/20"
          }`}
        >
          {t.inProgressTab} ({summary.inProgressCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("HEALTHY")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "HEALTHY"
              ? "bg-emerald-500 text-white font-bold shadow"
              : "bg-emerald-500/10 text-[#0B6E4F] hover:bg-emerald-500/20"
          }`}
        >
          {t.healthyTab} ({summary.healthyCount})
        </button>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredRecords.map((record) => (
          <DeepCleanRoomCard
            key={record.roomId}
            record={record}
            t={t}
            onOpenTreatment={(rec) => setActiveRecord(rec)}
          />
        ))}
      </div>

      {/* Log Treatment Modal */}
      <LogTreatmentModal
        record={activeRecord}
        t={t}
        onClose={() => setActiveRecord(null)}
        onSave={handleSaveTreatment}
      />
    </div>
  );
};
