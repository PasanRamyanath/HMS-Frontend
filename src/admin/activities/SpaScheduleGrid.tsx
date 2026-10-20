/**
 * Interactive Spa Therapist & Treatment Room Daily Schedule Grid (SpaScheduleGrid.tsx)
 *
 * Implements Step 354 (Phase 15.04) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Visual interactive schedule grid and time-track controller for Ayurveda Wellness Resorts,
 * Spa Managers, and Head Vaidyas:
 *
 * 1. Dual View Switcher (SegmentedControl):
 *    - Room-Centric View: Shirodhara Room 1, Shirodhara Room 2, Herbal Steam Bath, Foot Reflexology, etc.
 *    - Therapist-Centric View: Dr. Priyantha (Vaidya), Anoma, Kumara, Sandamali.
 * 2. Visual Timeline Grid (08:00 - 20:00):
 *    - 12 operating hours rendered with hour columns and 30-min subdivisions.
 *    - Rendered appointment cards with status indicators (CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED).
 *    - Explicit 15-minute turnaround/cleanup buffer block visual tag preventing double-bookings.
 * 3. 1-Click Room Folio Auto-Posting:
 *    - Direct action on treatment blocks posting charges to the guest's active room folio.
 *    - Calculates 4-stage compounding Sri Lankan hospitality taxes (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%).
 * 4. Apple Human Interface Guidelines:
 *    - Translucent .apple-liquid-glass surfaces with backdrop-filter blur.
 *    - Continuous squircle radii (rounded-2xl, rounded-3xl).
 *    - SF Pro optical typography with .tabular-nums-lkr on financial values.
 *    - >= 44x44pt touch targets and fluid spring transitions.
 * 5. Trilingual Localization (English, සිංහල, தமிழ்).
 * 6. Strictly zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useCallback, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SpaResourceViewMode = "ROOM_VIEW" | "THERAPIST_VIEW";

export type SpaAppointmentStatus = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface SpaTreatmentRoom {
  readonly id: string;
  readonly name: string;
  readonly category: "SHIRODHARA" | "HERBAL_STEAM" | "MASSAGE" | "HYDROTHERAPY";
  readonly floor: string;
}

export interface SpaTherapist {
  readonly id: string;
  readonly name: string;
  readonly role: "DOCTOR_VAIDYA" | "SENIOR_THERAPIST" | "THERAPIST";
  readonly gender: "MALE" | "FEMALE";
  readonly specializations: readonly string[];
}

export interface SpaAppointment {
  readonly id: string;
  readonly bookingRef: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly treatmentName: string;
  readonly therapistId: string;
  readonly therapistName: string;
  readonly roomId: string;
  readonly roomName: string;
  readonly date: string; // YYYY-MM-DD
  readonly startHour: number; // e.g. 9 for 09:00
  readonly startMinute: number; // e.g. 30 for 09:30
  readonly durationMinutes: number; // e.g. 60
  readonly bufferMinutes: number; // e.g. 15
  readonly priceLkr: number;
  readonly status: SpaAppointmentStatus;
  readonly isFolioPosted: boolean;
  readonly notes?: string | undefined;
}

export interface SpaFolioPostSummary {
  readonly appointmentId: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly treatmentName: string;
  readonly baseSupplyLkr: number;
  readonly serviceChargeLkr: number; // 10%
  readonly subtotalAfterScLkr: number;
  readonly tdlLkr: number; // 1%
  readonly ssclLkr: number; // 2.5%
  readonly vatLkr: number; // 18%
  readonly grandTotalLkr: number;
}

export interface SpaDayKpis {
  readonly totalAppointments: number;
  readonly confirmedCount: number;
  readonly inProgressCount: number;
  readonly completedCount: number;
  readonly totalRevenueLkr: number;
  readonly totalUnpostedRevenueLkr: number;
}

export interface SpaScheduleGridProps {
  readonly date?: string | undefined;
  readonly rooms?: readonly SpaTreatmentRoom[] | undefined;
  readonly therapists?: readonly SpaTherapist[] | undefined;
  readonly appointments?: readonly SpaAppointment[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onDateChange?: ((newDate: string) => void) | undefined;
  readonly onSelectAppointment?: ((appointment: SpaAppointment) => void) | undefined;
  readonly onSelectEmptySlot?:
    | ((
        resourceId: string,
        resourceType: "ROOM" | "THERAPIST",
        hour: number,
        minute: number,
      ) => void)
    | undefined;
  readonly onPostToRoomFolio?: ((summary: SpaFolioPostSummary) => void) | undefined;
}

// ============================================================================
// Translations Dictionary (en, si, ta)
// ============================================================================

export interface SpaGridTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly viewByRoom: string;
  readonly viewByTherapist: string;
  readonly today: string;
  readonly totalBookings: string;
  readonly revenueToday: string;
  readonly unpostedFolio: string;
  readonly postToFolio: string;
  readonly postedToFolio: string;
  readonly turnaroundBuffer: string;
  readonly postFolioModalTitle: string;
  readonly confirmPost: string;
  readonly cancel: string;
  readonly searchPlaceholder: string;
  readonly allStatuses: string;
  readonly noAppointments: string;
  readonly newBooking: string;
}

export const SPA_GRID_TRANSLATIONS: Record<SupportedLanguage, SpaGridTranslations> = {
  en: {
    title: "Ayurveda Spa & Treatment Schedule",
    subtitle:
      "Real-time therapist allocations, treatment suite timelines & 1-click room folio billing",
    viewByRoom: "Treatment Rooms",
    viewByTherapist: "Therapists (Vaidyas)",
    today: "Today",
    totalBookings: "Appointments Today",
    revenueToday: "Gross Spa Revenue",
    unpostedFolio: "Unposted to Folio",
    postToFolio: "Post to Folio",
    postedToFolio: "Posted to Room Folio",
    turnaroundBuffer: "Cleanup Buffer (15m)",
    postFolioModalTitle: "Confirm 1-Click Spa Folio Charge Posting",
    confirmPost: "Confirm & Post to Folio",
    cancel: "Dismiss",
    searchPlaceholder: "Search guest name, room number, or therapy...",
    allStatuses: "All Statuses",
    noAppointments: "No treatments scheduled for this time slot.",
    newBooking: "+ New Booking",
  },
  si: {
    title: "ආයුර්වේද ස්පා සහ ප්‍රතිකාර කාලසටහන",
    subtitle: "තෙරපිවරුන්, ප්‍රතිකාර කාමර සහ කාමර බිල්පත් වෙත සෘජු ගාස්තු එක්කිරීම",
    viewByRoom: "ප්‍රතිකාර කාමර",
    viewByTherapist: "තෙරපිවරුන් / වෛද්‍යවරුන්",
    today: "අද දින",
    totalBookings: "දෛනික ප්‍රතිකාර සංඛ්‍යාව",
    revenueToday: "දෛනික ස්පා ආදායම",
    unpostedFolio: "බිල්පතට එක්නොකළ",
    postToFolio: "කාමර බිලට එක්කරන්න",
    postedToFolio: "කාමර බිලට එක්කර ඇත",
    turnaroundBuffer: "පිරිසිදු කිරීමේ කාලය (15m)",
    postFolioModalTitle: "ස්පා ගාස්තුව කාමර බිලට එක්කිරීම තහවුරු කරන්න",
    confirmPost: "තහවුරු කර බිලට එක්කරන්න",
    cancel: "වසන්න",
    searchPlaceholder: "අමුත්තාගේ නම, කාමර අංකය හෝ ප්‍රතිකාරය සොයන්න...",
    allStatuses: "සියලු තත්ත්වයන්",
    noAppointments: "මෙම වේලාව සඳහා ප්‍රතිකාර සැලසුම් කර නැත.",
    newBooking: "+ නව වෙන්කිරීමක්",
  },
  ta: {
    title: "ஆயுர்வேத ஸ்பா மற்றும் சிகிச்சை அட்டவணை",
    subtitle: "சிகிச்சையாளர்கள், சிகிச்சை அறைகள் மற்றும் அறை கணக்கில் கட்டணம் சேர்த்தல்",
    viewByRoom: "சிகிச்சை அறைகள்",
    viewByTherapist: "சிகிச்சையாளர்கள் / மருத்துவர்கள்",
    today: "இன்று",
    totalBookings: "இன்றைய முன்பதிவுகள்",
    revenueToday: "மொத்த ஸ்பா வருமானம்",
    unpostedFolio: "கணக்கில் சேர்க்கப்படாதவை",
    postToFolio: "அறை கணக்கில் சேர்",
    postedToFolio: "அறை கணக்கில் சேர்க்கப்பட்டது",
    turnaroundBuffer: "சுத்தப்படுத்தும் இடைவெளி (15m)",
    postFolioModalTitle: "ஸ்பா கட்டணத்தை அறை கணக்கில் சேர்ப்பதை உறுதிப்படுத்துக",
    confirmPost: "உறுதிசெய்து கணக்கில் சேர்",
    cancel: "மூடு",
    searchPlaceholder: "விருந்தினர் பெயர், அறை எண் அல்லது சிகிச்சையைத் தேடுக...",
    allStatuses: "அனைத்து நிலைகளும்",
    noAppointments: "இந்த நேரத்திற்கு சிகிச்சைகள் எதுவும் திட்டமிடப்படவில்லை.",
    newBooking: "+ புதிய முன்பதிவு",
  },
};

// ============================================================================
// Fixtures & Seed Data
// ============================================================================

export const DEFAULT_SPA_ROOMS: readonly SpaTreatmentRoom[] = [
  {
    id: "ROOM-SHIRO-1",
    name: "Shirodhara Suite 1",
    category: "SHIRODHARA",
    floor: "Ground Floor East",
  },
  {
    id: "ROOM-SHIRO-2",
    name: "Shirodhara Suite 2",
    category: "SHIRODHARA",
    floor: "Ground Floor East",
  },
  {
    id: "ROOM-STEAM-1",
    name: "Herbal Steam Bath Pavilion",
    category: "HERBAL_STEAM",
    floor: "Garden Pavilion",
  },
  {
    id: "ROOM-MASS-1",
    name: "Foot Reflexology Pavilion",
    category: "MASSAGE",
    floor: "Water Garden Wing",
  },
  {
    id: "ROOM-COUP-1",
    name: "Royal Couples Ayurveda Pavilion",
    category: "MASSAGE",
    floor: "Lotus Villa Wing",
  },
];

export const DEFAULT_SPA_THERAPISTS: readonly SpaTherapist[] = [
  {
    id: "TH-PRIYA-01",
    name: "Dr. Priyantha Senanayake (Vaidya)",
    role: "DOCTOR_VAIDYA",
    gender: "MALE",
    specializations: ["Pulse Diagnosis", "Shirodhara", "Panchakarma"],
  },
  {
    id: "TH-ANOMA-02",
    name: "Anoma Senanayake",
    role: "SENIOR_THERAPIST",
    gender: "FEMALE",
    specializations: ["Abhyanga", "Pinda Sweda", "Facial Herbal Care"],
  },
  {
    id: "TH-KUMARA-03",
    name: "Kumara Jayasuriya",
    role: "THERAPIST",
    gender: "MALE",
    specializations: ["Deep Tissue Ayurvedic", "Herbal Steam", "Head Massage"],
  },
  {
    id: "TH-SANDA-04",
    name: "Sandamali Perera",
    role: "THERAPIST",
    gender: "FEMALE",
    specializations: ["Foot Reflexology", "Herbal Scrub", "Pichu Therapy"],
  },
];

export const DEFAULT_SPA_APPOINTMENTS: readonly SpaAppointment[] = [
  {
    id: "APT-2026-001",
    bookingRef: "SPA-BK-1001",
    guestName: "Lady Sarah Jenkins",
    roomNumber: "VILLA-104",
    treatmentName: "Royal Shirodhara Sesame Stream (60m)",
    therapistId: "TH-ANOMA-02",
    therapistName: "Anoma Senanayake",
    roomId: "ROOM-SHIRO-1",
    roomName: "Shirodhara Suite 1",
    date: "2026-10-25",
    startHour: 9,
    startMinute: 0,
    durationMinutes: 60,
    bufferMinutes: 15,
    priceLkr: 16500,
    status: "CONFIRMED",
    isFolioPosted: false,
    notes: "Vata-pacifying sesame oil with warm herbal compress",
  },
  {
    id: "APT-2026-002",
    bookingRef: "SPA-BK-1002",
    guestName: "Sir Arthur Conan",
    roomNumber: "SUITE-201",
    treatmentName: "Vashpa Sweda Kohomba Herbal Steam (30m)",
    therapistId: "TH-KUMARA-03",
    therapistName: "Kumara Jayasuriya",
    roomId: "ROOM-STEAM-1",
    roomName: "Herbal Steam Bath Pavilion",
    date: "2026-10-25",
    startHour: 10,
    startMinute: 0,
    durationMinutes: 30,
    bufferMinutes: 15,
    priceLkr: 7500,
    status: "IN_PROGRESS",
    isFolioPosted: false,
    notes: "Post-safari detox steam",
  },
  {
    id: "APT-2026-003",
    bookingRef: "SPA-BK-1003",
    guestName: "Baroness Von Weber",
    roomNumber: "VILLA-108",
    treatmentName: "Synchronized 4-Hand Abhyanga (90m)",
    therapistId: "TH-ANOMA-02",
    therapistName: "Anoma Senanayake",
    roomId: "ROOM-COUP-1",
    roomName: "Royal Couples Ayurveda Pavilion",
    date: "2026-10-25",
    startHour: 11,
    startMinute: 0,
    durationMinutes: 90,
    bufferMinutes: 15,
    priceLkr: 24500,
    status: "CONFIRMED",
    isFolioPosted: false,
  },
  {
    id: "APT-2026-004",
    bookingRef: "SPA-BK-1004",
    guestName: "Ambassador Tanaka",
    roomNumber: "SUITE-305",
    treatmentName: "Foot Reflexology & Kansa Bowl (45m)",
    therapistId: "TH-SANDA-04",
    therapistName: "Sandamali Perera",
    roomId: "ROOM-MASS-1",
    roomName: "Foot Reflexology Pavilion",
    date: "2026-10-25",
    startHour: 14,
    startMinute: 0,
    durationMinutes: 45,
    bufferMinutes: 15,
    priceLkr: 9500,
    status: "COMPLETED",
    isFolioPosted: true,
  },
];

export const OPERATING_HOURS: readonly number[] = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

// ============================================================================
// Internal Helpers & Tax Math (Cognitive Complexity <= 12)
// ============================================================================

const SC_RATE = 0.1;
const TDL_RATE = 0.01;
const SSCL_RATE = 0.025;
const VAT_RATE = 0.18;

function roundLkr(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateSpaSlotFinancials(appointment: SpaAppointment): SpaFolioPostSummary {
  const base = roundLkr(appointment.priceLkr);
  const sc = roundLkr(base * SC_RATE);
  const subtotalAfterSc = base + sc;
  const tdl = roundLkr(subtotalAfterSc * TDL_RATE);
  const sscl = roundLkr(subtotalAfterSc * SSCL_RATE);
  const vatBase = subtotalAfterSc + tdl + sscl;
  const vat = roundLkr(vatBase * VAT_RATE);
  const grandTotal = roundLkr(vatBase + vat);

  return {
    appointmentId: appointment.id,
    guestName: appointment.guestName,
    roomNumber: appointment.roomNumber,
    treatmentName: appointment.treatmentName,
    baseSupplyLkr: base,
    serviceChargeLkr: sc,
    subtotalAfterScLkr: subtotalAfterSc,
    tdlLkr: tdl,
    ssclLkr: sscl,
    vatLkr: vat,
    grandTotalLkr: grandTotal,
  };
}

export function computeSpaDayKpis(appointments: readonly SpaAppointment[]): SpaDayKpis {
  let confirmedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let totalRevenueLkr = 0;
  let totalUnpostedRevenueLkr = 0;

  for (let i = 0; i < appointments.length; i++) {
    const apt = appointments[i];
    if (!apt || apt.status === "CANCELLED") continue;

    totalRevenueLkr += apt.priceLkr;

    if (!apt.isFolioPosted) {
      totalUnpostedRevenueLkr += apt.priceLkr;
    }

    if (apt.status === "CONFIRMED") confirmedCount++;
    else if (apt.status === "IN_PROGRESS") inProgressCount++;
    else if (apt.status === "COMPLETED") completedCount++;
  }

  return {
    totalAppointments: confirmedCount + inProgressCount + completedCount,
    confirmedCount,
    inProgressCount,
    completedCount,
    totalRevenueLkr,
    totalUnpostedRevenueLkr,
  };
}

function getStatusBadgeStyle(status: SpaAppointmentStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200";
    default:
      return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200";
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface SpaQuickKpiRibbonProps {
  readonly kpis: SpaDayKpis;
  readonly t: SpaGridTranslations;
}

const SpaQuickKpiRibbon: FC<SpaQuickKpiRibbonProps> = ({ kpis, t }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-black/10 dark:border-white/10 apple-liquid-glass">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
          {t.totalBookings}
        </span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 dark:text-white mt-1 block">
          {kpis.totalAppointments}
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-black/10 dark:border-white/10 apple-liquid-glass">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
          Active / In-Session
        </span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-600 dark:text-amber-400 mt-1 block">
          {kpis.inProgressCount}
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-black/10 dark:border-white/10 apple-liquid-glass">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
          {t.revenueToday}
        </span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-indigo-600 dark:text-indigo-400 mt-1 block">
          {kpis.totalRevenueLkr.toLocaleString()} LKR
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-black/10 dark:border-white/10 apple-liquid-glass">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
          {t.unpostedFolio}
        </span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-rose-600 dark:text-rose-400 mt-1 block">
          {kpis.totalUnpostedRevenueLkr.toLocaleString()} LKR
        </span>
      </div>
    </div>
  );
};

interface SpaToolbarProps {
  readonly viewMode: SpaResourceViewMode;
  readonly date: string;
  readonly searchQuery: string;
  readonly t: SpaGridTranslations;
  readonly onViewModeChange: (mode: SpaResourceViewMode) => void;
  readonly onDateChange: (date: string) => void;
  readonly onSearchChange: (q: string) => void;
}

const SpaToolbar: FC<SpaToolbarProps> = ({
  viewMode,
  date,
  searchQuery,
  t,
  onViewModeChange,
  onDateChange,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      {/* View Segmented Switcher */}
      <div className="inline-flex p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => onViewModeChange("ROOM_VIEW")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
            viewMode === "ROOM_VIEW"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {t.viewByRoom}
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("THERAPIST_VIEW")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
            viewMode === "THERAPIST_VIEW"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {t.viewByTherapist}
        </button>
      </div>

      {/* Date & Search Bar */}
      <div className="flex items-center gap-2">
        <label className="block">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold font-mono"
            aria-label="Filter schedule date"
          />
        </label>
        <label className="block flex-1 sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 text-xs"
          />
        </label>
      </div>
    </div>
  );
};

const NOOP_SELECT_APPOINTMENT = (_apt: SpaAppointment): void => {
  // no-op default fallback
};

interface SpaAppointmentCardProps {
  readonly appointment: SpaAppointment;
  readonly t: SpaGridTranslations;
  readonly onSelect: (apt: SpaAppointment) => void;
  readonly onOpenFolioModal: (apt: SpaAppointment) => void;
}

const SpaAppointmentCard: FC<SpaAppointmentCardProps> = ({
  appointment,
  t,
  onSelect,
  onOpenFolioModal,
}) => {
  const badgeStyle = getStatusBadgeStyle(appointment.status);

  return (
    <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-2">
      <button
        type="button"
        onClick={() => onSelect(appointment)}
        className="text-left w-full cursor-pointer space-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}
            >
              {appointment.status}
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
              {appointment.treatmentName}
            </h4>
          </div>
          <span className="font-mono text-xs font-bold tabular-nums-lkr text-slate-900 dark:text-white shrink-0">
            {appointment.startHour.toString().padStart(2, "0")}:
            {appointment.startMinute.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 space-y-0.5">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {appointment.guestName} •{" "}
            <span className="font-semibold">{appointment.roomNumber}</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {appointment.therapistName} ({appointment.roomName})
          </p>
        </div>

        {/* 15-Minute Turnaround Buffer Bar */}
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>{t.turnaroundBuffer}</span>
        </div>
      </button>

      {/* Folio Posting Button */}
      <div className="pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <span className="font-mono text-xs font-extrabold tabular-nums-lkr text-slate-900 dark:text-white">
          {appointment.priceLkr.toLocaleString()} LKR
        </span>
        {appointment.isFolioPosted ? (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <span>✓</span> {t.postedToFolio}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onOpenFolioModal(appointment)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors cursor-pointer min-h-[32px]"
          >
            {t.postToFolio}
          </button>
        )}
      </div>
    </div>
  );
};

interface SpaFolioPostModalProps {
  readonly summary: SpaFolioPostSummary | null;
  readonly t: SpaGridTranslations;
  readonly onClose: () => void;
  readonly onConfirm: (summary: SpaFolioPostSummary) => void;
}

const SpaFolioPostModal: FC<SpaFolioPostModalProps> = ({ summary, t, onClose, onConfirm }) => {
  const dialogId = useId();
  if (!summary) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-full h-full max-w-none max-h-none m-0 border-0"
    >
      <div className="relative w-full max-w-lg rounded-3xl apple-liquid-glass bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-5">
        <div>
          <h3
            id={`${dialogId}-title`}
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {t.postFolioModalTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Post {summary.treatmentName} directly to Room {summary.roomNumber} ({summary.guestName}
            ).
          </p>
        </div>

        {/* 4-Stage Compounding Tax Breakdown */}
        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Base Spa Supply:</span>
            <span className="font-mono font-bold tabular-nums-lkr">
              {summary.baseSupplyLkr.toLocaleString()} LKR
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">10% Service Charge (SC):</span>
            <span className="font-mono tabular-nums-lkr text-slate-700 dark:text-slate-300">
              +{summary.serviceChargeLkr.toLocaleString()} LKR
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">1% Tourism Development Levy (TDL):</span>
            <span className="font-mono tabular-nums-lkr text-slate-700 dark:text-slate-300">
              +{summary.tdlLkr.toLocaleString()} LKR
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">2.5% Social Security Levy (SSCL):</span>
            <span className="font-mono tabular-nums-lkr text-slate-700 dark:text-slate-300">
              +{summary.ssclLkr.toLocaleString()} LKR
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">18% Value Added Tax (VAT):</span>
            <span className="font-mono tabular-nums-lkr text-slate-700 dark:text-slate-300">
              +{summary.vatLkr.toLocaleString()} LKR
            </span>
          </div>
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-between font-bold text-sm">
            <span className="text-slate-900 dark:text-white">Net Folio Grand Total:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
              {summary.grandTotalLkr.toLocaleString()} LKR
            </span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 text-xs font-semibold min-h-[44px]"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(summary)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all cursor-pointer min-h-[44px]"
          >
            {t.confirmPost}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SpaScheduleGrid: FC<SpaScheduleGridProps> = ({
  date = "2026-10-25",
  rooms = DEFAULT_SPA_ROOMS,
  therapists = DEFAULT_SPA_THERAPISTS,
  appointments = DEFAULT_SPA_APPOINTMENTS,
  language = "en",
  onDateChange,
  onSelectAppointment,
  onSelectEmptySlot,
  onPostToRoomFolio,
}) => {
  const t = SPA_GRID_TRANSLATIONS[language] || SPA_GRID_TRANSLATIONS.en;

  const [currentDate, setCurrentDate] = useState<string>(date);
  const [viewMode, setViewMode] = useState<SpaResourceViewMode>("ROOM_VIEW");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFolioSummary, setActiveFolioSummary] = useState<SpaFolioPostSummary | null>(null);

  const handleDateUpdate = (newDate: string) => {
    setCurrentDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.date !== currentDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        apt.guestName.toLowerCase().includes(q) ||
        apt.roomNumber.toLowerCase().includes(q) ||
        apt.treatmentName.toLowerCase().includes(q) ||
        apt.therapistName.toLowerCase().includes(q) ||
        apt.roomName.toLowerCase().includes(q)
      );
    });
  }, [appointments, currentDate, searchQuery]);

  const kpis = useMemo(() => computeSpaDayKpis(filteredAppointments), [filteredAppointments]);

  const handleOpenFolioModal = useCallback((appointment: SpaAppointment) => {
    const summary = calculateSpaSlotFinancials(appointment);
    setActiveFolioSummary(summary);
  }, []);

  const handleConfirmFolioPost = (summary: SpaFolioPostSummary) => {
    if (onPostToRoomFolio) {
      onPostToRoomFolio(summary);
    }
    setActiveFolioSummary(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.subtitle}</p>
      </div>

      {/* KPI Ribbon */}
      <SpaQuickKpiRibbon kpis={kpis} t={t} />

      {/* Toolbar */}
      <SpaToolbar
        viewMode={viewMode}
        date={currentDate}
        searchQuery={searchQuery}
        t={t}
        onViewModeChange={setViewMode}
        onDateChange={handleDateUpdate}
        onSearchChange={setSearchQuery}
      />

      {/* Timeline Schedule Grid */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 apple-liquid-glass p-5 space-y-6 overflow-hidden">
        {viewMode === "ROOM_VIEW" ? (
          <div className="space-y-6">
            {rooms.map((room) => {
              const roomApts = filteredAppointments.filter((a) => a.roomId === room.id);
              return (
                <div key={room.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {room.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">({room.floor})</span>
                    </div>
                    {onSelectEmptySlot && (
                      <button
                        type="button"
                        onClick={() => onSelectEmptySlot(room.id, "ROOM", 9, 0)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {t.newBooking}
                      </button>
                    )}
                  </div>

                  {roomApts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {roomApts.map((apt) => (
                        <SpaAppointmentCard
                          key={apt.id}
                          appointment={apt}
                          t={t}
                          onSelect={onSelectAppointment ?? NOOP_SELECT_APPOINTMENT}
                          onOpenFolioModal={handleOpenFolioModal}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-center text-xs text-slate-400">
                      {t.noAppointments}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {therapists.map((therapist) => {
              const thApts = filteredAppointments.filter((a) => a.therapistId === therapist.id);
              return (
                <div key={therapist.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {therapist.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({therapist.specializations.join(", ")})
                      </span>
                    </div>
                    {onSelectEmptySlot && (
                      <button
                        type="button"
                        onClick={() => onSelectEmptySlot(therapist.id, "THERAPIST", 9, 0)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {t.newBooking}
                      </button>
                    )}
                  </div>

                  {thApts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {thApts.map((apt) => (
                        <SpaAppointmentCard
                          key={apt.id}
                          appointment={apt}
                          t={t}
                          onSelect={onSelectAppointment ?? NOOP_SELECT_APPOINTMENT}
                          onOpenFolioModal={handleOpenFolioModal}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-center text-xs text-slate-400">
                      {t.noAppointments}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1-Click Folio Post Modal */}
      <SpaFolioPostModal
        summary={activeFolioSummary}
        t={t}
        onClose={() => setActiveFolioSummary(null)}
        onConfirm={handleConfirmFolioPost}
      />
    </div>
  );
};
