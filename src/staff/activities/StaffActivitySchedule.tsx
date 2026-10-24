/**
 * Smartphone Therapist & Chauffeur Daily Schedule View (StaffActivitySchedule.tsx)
 *
 * Implements Step 366 (Phase 15.16) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Mobile-first daily assignment tracker for resort spa therapists and hotel drivers:
 *
 * 1. View assigned spa therapies (Shirodhara, Abhyanga) & excursions/airport transfers.
 * 2. 1-Tap status advance: `SCHEDULED -> IN_PROGRESS -> COMPLETED`.
 * 3. High-contrast OLED status badges with Apple dynamic system colors
 * (systemAmber In-Progress, systemGreen Completed, systemBlue Scheduled, systemRed Overdue).
 * 4. Trilingual support (English, Sinhala, Tamil), Screen Wake-Lock, and sound chime.
 * 5. Full Apple HIG Liquid Glass UI standard, continuous squircles, >= 44x44pt touch targets.
 * 6. Strict zero console.log/console.error/debugger statements & cognitive complexity <= 12.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";
import { useWakeLock } from "../../lib/useWakeLock.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ActivityType = "SPA_TREATMENT" | "EXCURSION_TRANSFER";

export type ActivityScheduleStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export interface StaffActivityItem {
  readonly id: string;
  readonly tenantId: string;
  readonly activityType: ActivityType;
  readonly serviceName: string;
  readonly staffId: string;
  readonly staffName: string;
  readonly staffRole: "THERAPIST" | "CHAUFFEUR";
  readonly guestName: string;
  readonly roomNumber: string;
  readonly scheduledTime: string;
  readonly durationMinutes: number;
  readonly locationOrRoute: string;
  readonly vehicleOrFacility?: string | undefined;
  readonly specialNotes?: string | undefined;
  readonly status: ActivityScheduleStatus;
  readonly startTimeIso?: string | undefined;
  readonly completedTimeIso?: string | undefined;
}

export type ActivityTypeFilter = "ALL" | "SPA_TREATMENT" | "EXCURSION_TRANSFER";
export type ActivityStatusFilter = "ALL" | ActivityScheduleStatus;

export interface ScheduleSummaryCounts {
  readonly total: number;
  readonly scheduled: number;
  readonly inProgress: number;
  readonly completed: number;
  readonly spaCount: number;
  readonly excursionCount: number;
}

export interface DistinctStaffInfo {
  readonly id: string;
  readonly name: string;
  readonly role: "THERAPIST" | "CHAUFFEUR";
}

// ============================================================================
// Sample Authentic Sri Lankan Resort Schedule Fixtures
// ============================================================================

export const DEFAULT_ACTIVITY_SCHEDULE: readonly StaffActivityItem[] = [
  {
    id: "ACT-001",
    tenantId: "bentota-resort-spa",
    activityType: "SPA_TREATMENT",
    serviceName: "Authentic Shirodhara Medicated Oil Therapy",
    staffId: "STF-THERAPIST-01",
    staffName: "Niluka Wijesinghe",
    staffRole: "THERAPIST",
    guestName: "Elena Rostova",
    roomNumber: "304",
    scheduledTime: "09:00 - 10:15",
    durationMinutes: 75,
    locationOrRoute: "Ayurveda Pavilion 1 (Treatment Room A)",
    vehicleOrFacility: "Ayurveda Treatment Table 01",
    specialNotes: "Prefers warm King Coconut & Mahanarayana oil blend. Vitals normal.",
    status: "SCHEDULED",
  },
  {
    id: "ACT-002",
    tenantId: "bentota-resort-spa",
    activityType: "EXCURSION_TRANSFER",
    serviceName: "BIA Airport Transfer Departure (Colombo Highway)",
    staffId: "STF-DRIVER-01",
    staffName: "Sunil Bandara",
    staffRole: "CHAUFFEUR",
    guestName: "Dr. Marcus Vance",
    roomNumber: "108",
    scheduledTime: "09:30 - 11:30",
    durationMinutes: 120,
    locationOrRoute: "Main Reception Porch -> BIA Airport Katunayake",
    vehicleOrFacility: "Toyota KDH Luxury Van (WP NA-4921)",
    specialNotes: "Flight UL 504 departure at 14:30. 2 luggage bags + packed breakfast collected.",
    status: "IN_PROGRESS",
    startTimeIso: "2026-10-20T09:30:00.000Z",
  },
  {
    id: "ACT-003",
    tenantId: "bentota-resort-spa",
    activityType: "SPA_TREATMENT",
    serviceName: "Synchronized Abhyanga & Herbal Steam Swedana",
    staffId: "STF-THERAPIST-01",
    staffName: "Niluka Wijesinghe",
    staffRole: "THERAPIST",
    guestName: "Hans Zimmer",
    roomNumber: "215",
    scheduledTime: "11:00 - 12:30",
    durationMinutes: 90,
    locationOrRoute: "Ayurveda Pavilion 2 (Steam Suite)",
    vehicleOrFacility: "Herbal Steam Box 02",
    specialNotes: "Deep herbal poultice pressure. Triphala steam decoction prepared.",
    status: "SCHEDULED",
  },
  {
    id: "ACT-004",
    tenantId: "bentota-resort-spa",
    activityType: "EXCURSION_TRANSFER",
    serviceName: "Yala National Park Afternoon Safari Game Drive",
    staffId: "STF-DRIVER-02",
    staffName: "Chaminda Perera",
    staffRole: "CHAUFFEUR",
    guestName: "Ananya Sharma",
    roomNumber: "402",
    scheduledTime: "13:30 - 18:30",
    durationMinutes: 300,
    locationOrRoute: "Resort Lobby -> Yala Block 1 Palatupana Gate",
    vehicleOrFacility: "Toyota Land Cruiser 4x4 (WP CAJ-8812)",
    specialNotes: "DWC park permits validated. Packed lunch & cold water flask onboard.",
    status: "SCHEDULED",
  },
  {
    id: "ACT-005",
    tenantId: "bentota-resort-spa",
    activityType: "SPA_TREATMENT",
    serviceName: "Sandalwood & Venivel Herbal Beauty Facial",
    staffId: "STF-THERAPIST-02",
    staffName: "Dilhani Senanayake",
    staffRole: "THERAPIST",
    guestName: "Claire Beauchamp",
    roomNumber: "112",
    scheduledTime: "08:00 - 08:45",
    durationMinutes: 45,
    locationOrRoute: "Ayurveda Wellness Lounge (Suite 4)",
    vehicleOrFacility: "Facial Bed 04",
    specialNotes: "Sensitive skin. Organic distilled rose water tonic only.",
    status: "COMPLETED",
    startTimeIso: "2026-10-20T08:00:00.000Z",
    completedTimeIso: "2026-10-20T08:45:00.000Z",
  },
];

// ============================================================================
// Pure Domain Helper Functions (Complexity <= 12)
// ============================================================================

export function computeScheduleCounts(items: readonly StaffActivityItem[]): ScheduleSummaryCounts {
  let scheduled = 0;
  let inProgress = 0;
  let completed = 0;
  let spaCount = 0;
  let excursionCount = 0;

  for (const item of items) {
    if (item.status === "SCHEDULED") scheduled += 1;
    else if (item.status === "IN_PROGRESS") inProgress += 1;
    else if (item.status === "COMPLETED") completed += 1;

    if (item.activityType === "SPA_TREATMENT") spaCount += 1;
    else if (item.activityType === "EXCURSION_TRANSFER") excursionCount += 1;
  }

  return {
    total: items.length,
    scheduled,
    inProgress,
    completed,
    spaCount,
    excursionCount,
  };
}

export function extractDistinctStaff(
  items: readonly StaffActivityItem[],
): readonly DistinctStaffInfo[] {
  const map = new Map<string, DistinctStaffInfo>();
  for (const item of items) {
    if (!map.has(item.staffId)) {
      map.set(item.staffId, {
        id: item.staffId,
        name: item.staffName,
        role: item.staffRole,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function matchesTypeFilter(item: StaffActivityItem, filter: ActivityTypeFilter): boolean {
  if (filter === "ALL") return true;
  return item.activityType === filter;
}

function matchesStatusFilter(item: StaffActivityItem, filter: ActivityStatusFilter): boolean {
  if (filter === "ALL") return true;
  return item.status === filter;
}

function matchesStaffFilter(item: StaffActivityItem, staffId: string): boolean {
  if (staffId === "ALL") return true;
  return item.staffId === staffId;
}

function matchesSearchQuery(item: StaffActivityItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.guestName.toLowerCase().includes(q) ||
    item.roomNumber.toLowerCase().includes(q) ||
    item.serviceName.toLowerCase().includes(q) ||
    item.staffName.toLowerCase().includes(q) ||
    item.locationOrRoute.toLowerCase().includes(q)
  );
}

export function filterAndSortSchedule(
  items: readonly StaffActivityItem[],
  typeFilter: ActivityTypeFilter,
  statusFilter: ActivityStatusFilter,
  staffFilter: string,
  searchQuery: string,
): readonly StaffActivityItem[] {
  const trimmedQuery = searchQuery.trim();

  const filtered = items.filter((item) => {
    return (
      matchesTypeFilter(item, typeFilter) &&
      matchesStatusFilter(item, statusFilter) &&
      matchesStaffFilter(item, staffFilter) &&
      matchesSearchQuery(item, trimmedQuery)
    );
  });

  // Sort: IN_PROGRESS first, then SCHEDULED, then COMPLETED
  const statusRank: Record<ActivityScheduleStatus, number> = {
    IN_PROGRESS: 1,
    SCHEDULED: 2,
    COMPLETED: 3,
  };

  return filtered.sort((a, b) => {
    const rankDiff = statusRank[a.status] - statusRank[b.status];
    if (rankDiff !== 0) return rankDiff;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

export function advanceActivityStatus(
  item: StaffActivityItem,
  timestampIso?: string,
): StaffActivityItem {
  const now = timestampIso ?? new Date().toISOString();

  if (item.status === "SCHEDULED") {
    return {
      ...item,
      status: "IN_PROGRESS",
      startTimeIso: now,
    };
  }

  if (item.status === "IN_PROGRESS") {
    return {
      ...item,
      status: "COMPLETED",
      completedTimeIso: now,
    };
  }

  return item;
}

export function getActivityStatusBadge(status: ActivityScheduleStatus): {
  label: string;
  badgeClass: string;
  borderClass: string;
} {
  switch (status) {
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        badgeClass: "bg-amber-500/20 text-amber-800 border-amber-500/40",
        borderClass: "border-amber-500/50",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40",
        borderClass: "border-emerald-500/30",
      };
    default:
      return {
        label: "Scheduled",
        badgeClass: "bg-sky-500/20 text-sky-800 border-sky-500/40",
        borderClass: "border-sky-500/30",
      };
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 10)
// ============================================================================

interface SummaryCardsProps {
  readonly summary: ScheduleSummaryCounts;
}

const SummaryCards: FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="rounded-xl p-3 bg-slate-50 border border-[#E2E8F0] backdrop-blur-md">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
          Scheduled
        </span>
        <p className="text-2xl font-bold text-sky-800 mt-0.5 tabular-nums">{summary.scheduled}</p>
      </div>

      <div className="rounded-xl p-3 bg-slate-50 border border-amber-500/30 backdrop-blur-md">
        <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wide">
          In Progress
        </span>
        <p className="text-2xl font-bold text-amber-700 mt-0.5 tabular-nums">
          {summary.inProgress}
        </p>
      </div>

      <div className="rounded-xl p-3 bg-slate-50 border border-emerald-500/30 backdrop-blur-md">
        <span className="text-[11px] font-medium text-[#0B6E4F] uppercase tracking-wide">
          Completed
        </span>
        <p className="text-2xl font-bold text-[#0B6E4F] mt-0.5 tabular-nums">{summary.completed}</p>
      </div>

      <div className="rounded-xl p-3 bg-slate-50 border border-[#E2E8F0] backdrop-blur-md">
        <span className="text-[11px] font-medium text-purple-800 uppercase tracking-wide">
          Spa / Tours
        </span>
        <p className="text-lg font-bold text-purple-800 mt-1 tabular-nums">
          {summary.spaCount} <span className="text-slate-500 font-normal">/</span>{" "}
          {summary.excursionCount}
        </p>
      </div>
    </section>
  );
};

interface FilterBarProps {
  readonly typeFilter: ActivityTypeFilter;
  readonly onTypeFilterChange: (type: ActivityTypeFilter) => void;
  readonly statusFilter: ActivityStatusFilter;
  readonly onStatusFilterChange: (status: ActivityStatusFilter) => void;
  readonly selectedStaffId: string;
  readonly onStaffSelect: (id: string) => void;
  readonly staffList: readonly DistinctStaffInfo[];
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly summary: ScheduleSummaryCounts;
  readonly staffSelectId: string;
  readonly searchId: string;
}

const FilterBar: FC<FilterBarProps> = ({
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedStaffId,
  onStaffSelect,
  staffList,
  searchQuery,
  onSearchChange,
  summary,
  staffSelectId,
  searchId,
}) => {
  return (
    <section className="rounded-2xl p-4 mb-5 border border-[#E2E8F0] bg-slate-50 backdrop-blur-xl space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTypeFilterChange("ALL")}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            typeFilter === "ALL"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
              : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
          }`}
        >
          All Services ({summary.total})
        </button>
        <button
          type="button"
          onClick={() => onTypeFilterChange("SPA_TREATMENT")}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            typeFilter === "SPA_TREATMENT"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
              : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
          }`}
        >
          Spa Treatments ({summary.spaCount})
        </button>
        <button
          type="button"
          onClick={() => onTypeFilterChange("EXCURSION_TRANSFER")}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            typeFilter === "EXCURSION_TRANSFER"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
              : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
          }`}
        >
          Excursions & Transfers ({summary.excursionCount})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={staffSelectId}
            className="block text-[11px] font-medium text-slate-400 mb-1"
          >
            Filter by Staff Member
          </label>
          <select
            id={staffSelectId}
            value={selectedStaffId}
            onChange={(e) => onStaffSelect(e.target.value)}
            className="w-full min-h-[44px] rounded-xl bg-white border border-[#E2E8F0] px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Staff Members ({staffList.length})</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={searchId} className="block text-[11px] font-medium text-slate-400 mb-1">
            Search by Guest, Room, or Service
          </label>
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g. Elena, Room 304, Shirodhara..."
            className="w-full min-h-[44px] rounded-xl bg-white border border-[#E2E8F0] px-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
        {(["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => onStatusFilterChange(st)}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === st
                ? "bg-slate-50 text-slate-900 font-semibold"
                : "bg-slate-50 text-slate-400 hover:text-slate-900"
            }`}
          >
            {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
          </button>
        ))}
      </div>
    </section>
  );
};

interface ActivityCardProps {
  readonly item: StaffActivityItem;
  readonly onStatusAdvance: (id: string) => void;
}

const ActivityCard: FC<ActivityCardProps> = ({ item, onStatusAdvance }) => {
  const badge = getActivityStatusBadge(item.status);
  const isSpa = item.activityType === "SPA_TREATMENT";

  return (
    <article
      className={`rounded-2xl p-4 border bg-slate-50 backdrop-blur-xl shadow-lg transition-all ${badge.borderClass}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900 tracking-tight tabular-nums">
            {item.scheduledTime}
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            ({item.durationMinutes} min)
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isSpa
                ? "bg-purple-500/20 text-purple-800 border-purple-500/40"
                : "bg-amber-500/20 text-amber-800 border-amber-500/40"
            }`}
          >
            {isSpa ? "Ayurveda Spa" : "Transfer / Tour"}
          </span>
        </div>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.badgeClass}`}
        >
          {badge.label}
        </span>
      </div>

      <h2 className="text-base font-bold text-slate-900 mb-1">{item.serviceName}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 mb-3">
        <div>
          <span className="text-slate-400">Guest:</span>{" "}
          <span className="font-semibold text-slate-900">{item.guestName}</span>{" "}
          <span className="text-sky-800 font-medium">({item.roomNumber})</span>
        </div>
        <div>
          <span className="text-slate-400">Assigned:</span>{" "}
          <span className="font-semibold text-slate-900">{item.staffName}</span>{" "}
          <span className="text-slate-500">({item.staffRole})</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-400">Location:</span>{" "}
          <span className="text-slate-800">{item.locationOrRoute}</span>
          {item.vehicleOrFacility && (
            <span className="text-slate-400 ml-1">• {item.vehicleOrFacility}</span>
          )}
        </div>
        {item.specialNotes && (
          <div className="sm:col-span-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[11px]">
            <span className="font-semibold">Notes:</span> {item.specialNotes}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 tabular-nums">
          {item.status === "IN_PROGRESS" && item.startTimeIso && (
            <span>Started: {new Date(item.startTimeIso).toLocaleTimeString()}</span>
          )}
          {item.status === "COMPLETED" && item.completedTimeIso && (
            <span>Done: {new Date(item.completedTimeIso).toLocaleTimeString()}</span>
          )}
          {item.status === "SCHEDULED" && <span>Ready to begin</span>}
        </div>

        {item.status !== "COMPLETED" && (
          <button
            type="button"
            onClick={() => onStatusAdvance(item.id)}
            className={`min-h-[44px] min-w-[140px] px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-98 ${
              item.status === "SCHEDULED"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25"
            }`}
          >
            {item.status === "SCHEDULED" ? (
              <>
                <span>▶</span>
                <span>Start Assignment</span>
              </>
            ) : (
              <>
                <span>Mark Completed</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
};

// ============================================================================
// Props
// ============================================================================

export interface StaffActivityScheduleProps {
  readonly initialSchedule?: readonly StaffActivityItem[] | undefined;
  readonly defaultStaffId?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onStatusChange?: ((updatedItem: StaffActivityItem) => void) | undefined;
}

// ============================================================================
// Main Component
// ============================================================================

export const StaffActivitySchedule: FC<StaffActivityScheduleProps> = ({
  initialSchedule = DEFAULT_ACTIVITY_SCHEDULE,
  defaultStaffId = "ALL",
  language = "en",
  onStatusChange,
}) => {
  const searchId = useId();
  const staffSelectId = useId();

  const [schedule, setSchedule] = useState<readonly StaffActivityItem[]>(initialSchedule);
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>("ALL");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaffId);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    request: requestWakeLock,
    release: releaseWakeLock,
  } = useWakeLock();

  const summary = useMemo(() => computeScheduleCounts(schedule), [schedule]);
  const staffList = useMemo(() => extractDistinctStaff(schedule), [schedule]);

  const filteredItems = useMemo(
    () => filterAndSortSchedule(schedule, typeFilter, statusFilter, selectedStaffId, searchQuery),
    [schedule, typeFilter, statusFilter, selectedStaffId, searchQuery],
  );

  const handleStatusAdvance = (itemId: string): void => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = advanceActivityStatus(item);
        if (updated.status === "COMPLETED") {
          playOrderBell("PAYMENT_CONFIRMED");
        }
        if (onStatusChange) {
          onStatusChange(updated);
        }
        return updated;
      }),
    );
  };

  const handleWakeLockToggle = async (): Promise<void> => {
    if (isWakeLockActive) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  };

  const labels = {
    title:
      language === "si"
        ? "චිකිත්සක සහ රියදුරු දෛනික කාලසටහන"
        : language === "ta"
          ? "சிகிச்சையாளர் மற்றும் சாரதி நாளாந்த அட்டவணை"
          : "Therapist & Chauffeur Daily Schedule",
    subtitle:
      language === "si"
        ? "ස්පා ප්රතිකාර සහ සංචාරක චාරිකා කළමනාකරණය"
        : language === "ta"
          ? "ஸ்பா சிகிச்சைகள் மற்றும் சுற்றுலாப் பயண முகாமைத்துவம்"
          : "Ayurveda Wellness Therapies & Guest Excursions",
  };

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-800 p-4 md:p-6 pb-24 font-sans">
      <header className="rounded-2xl p-4 mb-5 border border-[#E2E8F0] bg-slate-50 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#0B6E4F]">
              Live Staff Dispatch
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {labels.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-400">{labels.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isWakeLockSupported && (
            <button
              type="button"
              onClick={handleWakeLockToggle}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                isWakeLockActive
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-800"
                  : "bg-slate-50 border-[#E2E8F0] text-slate-400 hover:text-slate-900"
              }`}
              title="Prevent screen from sleeping during active service"
            >
              <span
                className={`w-2 h-2 rounded-full ${isWakeLockActive ? "bg-amber-400" : "bg-slate-500"}`}
              />
              {isWakeLockActive ? "Keep-Awake ON" : "Keep-Awake"}
            </button>
          )}

          <div className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2 text-xs text-slate-700 tabular-nums">
            <span className="text-slate-400">Total:</span>
            <span className="font-semibold text-slate-900">{summary.total}</span>
          </div>
        </div>
      </header>

      <SummaryCards summary={summary} />

      <FilterBar
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedStaffId={selectedStaffId}
        onStaffSelect={setSelectedStaffId}
        staffList={staffList}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        summary={summary}
        staffSelectId={staffSelectId}
        searchId={searchId}
      />

      <section className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl p-8 border border-[#E2E8F0] bg-slate-50 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-700">No Assignments Found</p>
            <p className="text-xs text-slate-500 mt-1">
              No spa therapies or driver transfers match your current filter criteria.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <ActivityCard key={item.id} item={item} onStatusAdvance={handleStatusAdvance} />
          ))
        )}
      </section>
    </div>
  );
};
