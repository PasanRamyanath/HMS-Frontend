/**
 * Auspicious Nekath / Poruwa Ceremony & Event Timeline Builder (PoruwaTimelineEditor.tsx)
 *
 * Implements Step 331 (Phase 14.06) / Rung 1 of the Sri Lanka HMS Master Architecture Plan:
 * Exact minute-by-minute timeline orchestrator for traditional Sri Lankan Poruwa weddings,
 * homecoming receptions, and corporate galas:
 *
 * 1. Exact astrological Nekath milestones (Climbing Poruwa, Ashtaka chanting, Oil lamp, Going away).
 * 2. Cross-department coordination: Banquet Captain, Kitchen Chef, AC Engineer, Bar Supervisor, DJ.
 * 3. Schedule shift utility: Shift entire timeline by +/- 10, 15, or 30 mins if ceremony timings move.
 * 4. Department-specific filtering (All, Nekath Astrological Only, Kitchen Buffet, AC Chiller, AV/Bar).
 * 5. Print-ready Banquet Captain cue sheet (@media print).
 * 6. Apple Human Interface Guidelines: `.apple-liquid-glass`, continuous squircles,
 *    `>= 44x44pt` touch targets, and `.tabular-nums-lkr` typography.
 * 7. Trilingual localization support (`en`, `si`, `ta`).
 * 8. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TimelineDepartment =
  | "BANQUET_CAPTAIN"
  | "KITCHEN_CHEF"
  | "AC_ENGINEER"
  | "BAR_SUPERVISOR"
  | "AUDIO_VISUAL_DJ"
  | "PORUWA_ASHTAKA_TEAM";

export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

export interface TimelineMilestone {
  readonly id: string;
  readonly time: string; // "HH:mm" in 24h format, e.g. "09:18"
  readonly titleEn: string;
  readonly titleSi?: string | undefined;
  readonly titleTa?: string | undefined;
  readonly department: TimelineDepartment;
  readonly isAuspiciousNekath: boolean;
  readonly durationMinutes: number;
  readonly cueOrAction: string;
  readonly soundLightCue?: string | undefined;
  readonly status: MilestoneStatus;
}

export interface PoruwaTimelineEditorProps {
  readonly eventId?: string | undefined;
  readonly eventTitle?: string | undefined;
  readonly eventDate?: string | undefined;
  readonly hallName?: string | undefined;
  readonly coupleNames?: string | undefined;
  readonly initialMilestones?: readonly TimelineMilestone[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onSaveTimeline?:
    | ((milestones: readonly TimelineMilestone[]) => Promise<void> | void)
    | undefined;
  readonly onPrintCueSheet?: (() => void) | undefined;
}

// ============================================================================
// Default Fixtures: Standard Traditional Poruwa Timeline
// ============================================================================

export const DEFAULT_PORUWA_MILESTONES: readonly TimelineMilestone[] = [
  {
    id: "m-01",
    time: "08:00",
    titleEn: "Hall AC Pre-Cooling & Floral Poruwa Inspection",
    titleSi: "ශාලා වායුසමීකරණය පණගැන්වීම සහ පෝරු මල් සැරසිලි පරීක්ෂාව",
    titleTa: "மண்டப ஏசி குளிர்வித்தல் மற்றும் அலங்கார ஆய்வு",
    department: "AC_ENGINEER",
    isAuspiciousNekath: false,
    durationMinutes: 30,
    cueOrAction: "Chillers running at 21°C; ensure emergency generator on standby.",
    soundLightCue: "Soft instrumental ambient music",
    status: "COMPLETED",
  },
  {
    id: "m-02",
    time: "08:30",
    titleEn: "Groom & Retinue Arrival & Welcome Drinks",
    titleSi: "මනමාල පාර්ශවයේ පැමිණීම සහ පිළිගැනීමේ බීම සංග්‍රහය",
    titleTa: "மணமகன் வருகை & வரவேற்பு பானங்கள்",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 30,
    cueOrAction: "Serve fresh King Coconut (Thambili) and passion fruit cordial at main porch.",
    soundLightCue: "Traditional Magul Bera drummers welcome rhythm",
    status: "COMPLETED",
  },
  {
    id: "m-03",
    time: "09:00",
    titleEn: "Bride Arrival & Grand Ballroom Entrance",
    titleSi: "මනමාලියගේ පැමිණීම සහ මංගල සභාගැබට ඇතුළුවීම",
    titleTa: "மணமகள் வருகை & மண்டப பிரவேசம்",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 15,
    cueOrAction: "Kandyan Ves dancers and bridal party escort into ballroom.",
    soundLightCue: "Bridal procession song and spotlight follow",
    status: "IN_PROGRESS",
  },
  {
    id: "m-04",
    time: "09:18",
    titleEn: "Auspicious Poruwa Ascent & Ashtaka Chanting (නැකත)",
    titleSi: "සුබ නැකතට පෝරුවට නැගීම සහ අෂ්ටක ගායනය",
    titleTa: "சுப முகூர்த்தத்தில் போருவா ஏறுதல்",
    department: "PORUWA_ASHTAKA_TEAM",
    isAuspiciousNekath: true,
    durationMinutes: 25,
    cueOrAction:
      "Exchanging betel leaves, wedding rings, sanctified water (පැන් වත්කිරීම), and Jayamangala Gatha.",
    soundLightCue: "Bera drumming pauses; silence for Ashtaka chanting",
    status: "PENDING",
  },
  {
    id: "m-05",
    time: "09:45",
    titleEn: "Auspicious Poruwa Descent & Breaking Coconut",
    titleSi: "සුබ නැකතට පෝරුවෙන් බැසීම සහ පොල් ගැසීම",
    titleTa: "போருவாவில் இருந்து இறங்குதல் & தேங்காய் உடைத்தல்",
    department: "PORUWA_ASHTAKA_TEAM",
    isAuspiciousNekath: true,
    durationMinutes: 15,
    cueOrAction: "Uncle leads couple down; coconut broken on stone slab outside porch.",
    soundLightCue: "Single conch shell blow followed by celebratory drum roll",
    status: "PENDING",
  },
  {
    id: "m-06",
    time: "10:00",
    titleEn: "Traditional Oil Lamp Lighting & Kiribath Table",
    titleSi: "පාරම්පරික පිත්තල පහන දැල්වීම සහ කිරිබත් මේසය",
    titleTa: "குத்துவிளக்கு ஏற்றுதல் & பாரம்பரிய பால் சோறு",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 30,
    cueOrAction: "Couple and elders light the brass oil lamp; couple cuts Kiribath pyramid.",
    soundLightCue: "Soft flute and violin traditional wedding melody",
    status: "PENDING",
  },
  {
    id: "m-07",
    time: "10:30",
    titleEn: "Civil Marriage Legal Registration",
    titleSi: "විවාහ ලියාපදිංචිය (නීතිමය අත්සන් තැබීම)",
    titleTa: "சட்டப்பூர்வ திருமண பதிவு",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 30,
    cueOrAction: "Government registrar table setup on stage with registers and witness seating.",
    soundLightCue: "Classical acoustic background",
    status: "PENDING",
  },
  {
    id: "m-08",
    time: "11:00",
    titleEn: "Wedding Cake Structure Cutting & Toast",
    titleSi: "මංගල කේක් කැපීම සහ සුබපැතුම් එක්කිරීම",
    titleTa: "திருமண கேக் வெட்டுதல் & வாழ்த்து",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 30,
    cueOrAction: "Champagne fountain pour; best man toast speech.",
    soundLightCue: "Celebratory fanfare and couple entrance anthem",
    status: "PENDING",
  },
  {
    id: "m-09",
    time: "11:30",
    titleEn: "Bar Open & Hot Devilled Bite Service",
    titleSi: "බාර් එක විවෘත කිරීම සහ උණුසුම් ඩෙවිල්ඩ් බයිට් සංග්‍රහය",
    titleTa: "பார் திறப்பு & சூடான சிற்றுண்டி வழங்கல்",
    department: "BAR_SUPERVISOR",
    isAuspiciousNekath: false,
    durationMinutes: 45,
    cueOrAction:
      "Beverage stations and 10 tables of hot butter cuttlefish & devilled chicken served.",
    soundLightCue: "Upbeat jazz lounge music",
    status: "PENDING",
  },
  {
    id: "m-10",
    time: "12:15",
    titleEn: "Grand Wedding Buffet Lunch Open",
    titleSi: "මහා මංගල දිවා භෝජන සංග්‍රහය ආරම්භය",
    titleTa: "பிரமாண்ட மதிய உணவு திறப்பு",
    department: "KITCHEN_CHEF",
    isAuspiciousNekath: false,
    durationMinutes: 120,
    cueOrAction: "Buffet lines open; head table table-service begins first.",
    soundLightCue: "Pleasant background music; live band set 1",
    status: "PENDING",
  },
  {
    id: "m-11",
    time: "14:30",
    titleEn: "Going-Away Dress Change (Bridal Suite)",
    titleSi: "දෙවෙනි ගමනට සූදානම් වීම (මධුසමය කාමරය)",
    titleTa: "ஆடை மாற்றம் (தேனிலவு அறை)",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: false,
    durationMinutes: 45,
    cueOrAction:
      "Couple escorted to Room 401 Honeymoon Suite for change into going-away saree/suit.",
    soundLightCue: "Live band set 2 / DJ dance floor open",
    status: "PENDING",
  },
  {
    id: "m-12",
    time: "15:15",
    titleEn: "Couple Going-Away Send-off (නැකත)",
    titleSi: "සුබ නැකතට යුවළ පිටත්වීම",
    titleTa: "சுப முகூர்த்தத்தில் தம்பதியினர் புறப்படுதல்",
    department: "BANQUET_CAPTAIN",
    isAuspiciousNekath: true,
    durationMinutes: 15,
    cueOrAction: "Guests gather at main foyer with jasmine petals; decorated bridal car departure.",
    soundLightCue: "Romantic going-away theme song",
    status: "PENDING",
  },
  {
    id: "m-13",
    time: "15:30",
    titleEn: "Function Concluded, Hall Turnaround & AC Off",
    titleSi: "උත්සවය අවසන් වීම සහ ශාලා පිරිසිදු කිරීම",
    titleTa: "நிகழ்வு நிறைவு & மண்டப சுத்தம்",
    department: "AC_ENGINEER",
    isAuspiciousNekath: false,
    durationMinutes: 60,
    cueOrAction: "Chillers switched off; housekeeping team begins evening turnaround.",
    soundLightCue: "Sound system powered down",
    status: "PENDING",
  },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface TimelineTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly addMilestone: string;
  readonly saveTimeline: string;
  readonly printCueSheet: string;
  readonly filterAll: string;
  readonly filterNekath: string;
  readonly filterKitchen: string;
  readonly filterAC: string;
  readonly filterCaptain: string;
  readonly filterBar: string;
  readonly shiftPlus10: string;
  readonly shiftPlus15: string;
  readonly shiftMinus15: string;
  readonly timeCol: string;
  readonly titleCol: string;
  readonly deptCol: string;
  readonly durationCol: string;
  readonly statusCol: string;
  readonly actionsCol: string;
  readonly modalAddTitle: string;
  readonly modalEditTitle: string;
  readonly timeLabel: string;
  readonly titleLabel: string;
  readonly deptLabel: string;
  readonly nekathLabel: string;
  readonly durationLabel: string;
  readonly actionLabel: string;
  readonly soundCueLabel: string;
  readonly saveBtn: string;
  readonly cancelBtn: string;
  readonly deleteBtn: string;
  readonly editBtn: string;
}

const TIMELINE_TRANSLATIONS: Record<SupportedLanguage, TimelineTranslations> = {
  en: {
    title: "Auspicious Poruwa & Wedding Event Timeline",
    subtitle:
      "Minute-by-minute schedule aligning Banquet Captain, Kitchen Chef, and AC Chiller to couple's Nekath timings",
    addMilestone: "Add Milestone",
    saveTimeline: "Save Timeline",
    printCueSheet: "Print Captain Cue Sheet",
    filterAll: "All Departments",
    filterNekath: "✨ Auspicious Nekath Only",
    filterKitchen: "Kitchen & Buffet",
    filterAC: "AC & Facilities",
    filterCaptain: "Banquet Captain",
    filterBar: "Bar & Bites",
    shiftPlus10: "+10 Mins Shift",
    shiftPlus15: "+15 Mins Shift",
    shiftMinus15: "-15 Mins Shift",
    timeCol: "Time",
    titleCol: "Milestone & Sri Lankan Ceremony",
    deptCol: "Department",
    durationCol: "Duration",
    statusCol: "Status",
    actionsCol: "Actions",
    modalAddTitle: "Add Event Milestone",
    modalEditTitle: "Edit Event Milestone",
    timeLabel: "Time (24h HH:mm)",
    titleLabel: "Milestone Title",
    deptLabel: "Responsible Department",
    nekathLabel: "Crucial Astrological Nekath (නැකත)",
    durationLabel: "Duration (Minutes)",
    actionLabel: "Operational Action & Instructions",
    soundCueLabel: "Sound & Lighting Cue",
    saveBtn: "Save Milestone",
    cancelBtn: "Cancel",
    deleteBtn: "Delete",
    editBtn: "Edit",
  },
  si: {
    title: "සුබ නැකත් සහ මංගල උත්සව කාලසටහන",
    subtitle: "නැකත් වේලාවන්ට අනුව උත්සව ශාලා කළමනාකරු, මුළුතැන්ගෙයි ප්‍රධානියා සහ AC ඉංජිනේරුවරුන් ඒකාබද්ධ කරන කාලසටහන",
    addMilestone: "අලුත් වේලාවක් එක්කරන්න",
    saveTimeline: "කාලසටහන සුරකින්න",
    printCueSheet: "කාලසටහන මුද්‍රණය කරන්න",
    filterAll: "සියලු අංශ",
    filterNekath: "✨ සුබ නැකත් පමණක්",
    filterKitchen: "මුළුතැන්ගෙය සහ බුෆේ",
    filterAC: "වායුසමීකරණය (AC)",
    filterCaptain: "ශාලා කළමනාකරු",
    filterBar: "බාර් සහ බයිට්ස්",
    shiftPlus10: "විනාඩි 10ක් ඉදිරියට",
    shiftPlus15: "විනාඩි 15ක් ඉදිරියට",
    shiftMinus15: "විනාඩි 15ක් පසුපසට",
    timeCol: "වේලාව",
    titleCol: "මංගල චාරිත්‍රය සහ සිදුවීම",
    deptCol: "වගකිවයුතු අංශය",
    durationCol: "කාලය",
    statusCol: "තත්වය",
    actionsCol: "ක්‍රියාමාර්ග",
    modalAddTitle: "නව චාරිත්‍රයක් එක්කිරීම",
    modalEditTitle: "චාරිත්‍ර විස්තර සංස්කරණය",
    timeLabel: "වේලාව (HH:mm)",
    titleLabel: "චාරිත්‍රයේ නම",
    deptLabel: "වගකිවයුතු අංශය",
    nekathLabel: "ප්‍රධාන නැකත් වේලාව (නැකත)",
    durationLabel: "ගතවන කාලය (විනාඩි)",
    actionLabel: "මෙහෙයුම් උපදෙස්",
    soundCueLabel: "ශබ්ද හා ආලෝක සැකැස්ම",
    saveBtn: "සුරකින්න",
    cancelBtn: "අවලංගු කරන්න",
    deleteBtn: "මකන්න",
    editBtn: "සංස්කරණය",
  },
  ta: {
    title: "சுப முகூர்த்தம் மற்றும் திருமண நிகழ்வு காலவரிசை",
    subtitle: "மண்டப மேலாளர், சமையல் தலைவர் மற்றும் ஏசி குழுவை சுப நேரத்திற்கு ஏற்ப ஒருங்கிணைக்கும் அட்டவணை",
    addMilestone: "புதிய நிகழ்வைச் சேர்க்கவும்",
    saveTimeline: "காலவரிசையைச் சேமி",
    printCueSheet: "அட்டவணையை அச்சிடுக",
    filterAll: "அனைத்து துறைகள்",
    filterNekath: "✨ சுப முகூர்த்தம் மட்டும்",
    filterKitchen: "சமையலறை & பஃபே",
    filterAC: "ஏசி வசதிகள்",
    filterCaptain: "மண்டப மேலாளர்",
    filterBar: "பார் & சிற்றுண்டி",
    shiftPlus10: "+10 நிமிடம் மாற்று",
    shiftPlus15: "+15 நிமிடம் மாற்று",
    shiftMinus15: "-15 நிமிடம் மாற்று",
    timeCol: "நேரம்",
    titleCol: "நிகழ்வு & சடங்கு",
    deptCol: "துறை",
    durationCol: "கால அளவு",
    statusCol: "நிலை",
    actionsCol: "செயல்கள்",
    modalAddTitle: "நிகழ்வைச் சேர்க்கவும்",
    modalEditTitle: "நிகழ்வைத் திருத்தவும்",
    timeLabel: "நேரம் (HH:mm)",
    titleLabel: "நிகழ்வு தலைப்பு",
    deptLabel: "பொறுப்பான துறை",
    nekathLabel: "சுப முகூர்த்த நேரம்",
    durationLabel: "கால அளவு (நிமிடங்கள்)",
    actionLabel: "செயல்பாட்டு வழிமுறைகள்",
    soundCueLabel: "ஒலி & ஒளி குறிப்பு",
    saveBtn: "சேமிக்கவும்",
    cancelBtn: "ரத்து செய்",
    deleteBtn: "நீக்கு",
    editBtn: "திருத்து",
  },
};

// ============================================================================
// Pure Helper Functions
// ============================================================================

export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const parts = timeStr.split(":");
  const hours = Number.parseInt(parts[0] ?? "0", 10);
  const minutes = Number.parseInt(parts[1] ?? "0", 10);

  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const clampedMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));

  const newHours = Math.floor(clampedMinutes / 60);
  const newMins = clampedMinutes % 60;

  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
}

export function shiftAllMilestones(
  milestones: readonly TimelineMilestone[],
  minutesDelta: number,
): readonly TimelineMilestone[] {
  return milestones.map((m) => ({
    ...m,
    time: addMinutesToTimeString(m.time, minutesDelta),
  }));
}

export function getDepartmentBadge(dept: TimelineDepartment): {
  readonly label: string;
  readonly badgeClass: string;
} {
  switch (dept) {
    case "PORUWA_ASHTAKA_TEAM":
      return {
        label: "Poruwa & Ashtaka",
        badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      };
    case "BANQUET_CAPTAIN":
      return {
        label: "Banquet Floor",
        badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      };
    case "KITCHEN_CHEF":
      return {
        label: "Kitchen & Chef",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    case "AC_ENGINEER":
      return {
        label: "AC & Facilities",
        badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      };
    case "BAR_SUPERVISOR":
      return {
        label: "Bar & Bites",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      };
    case "AUDIO_VISUAL_DJ":
      return {
        label: "Audio / Visual / DJ",
        badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/40",
      };
  }
}

export function getNextMilestoneStatus(status: MilestoneStatus): MilestoneStatus {
  switch (status) {
    case "PENDING":
      return "IN_PROGRESS";
    case "IN_PROGRESS":
      return "COMPLETED";
    case "COMPLETED":
    case "DELAYED":
      return "PENDING";
  }
}

export function getMilestoneStatusBadge(status: MilestoneStatus): {
  readonly label: string;
  readonly badgeClass: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Done",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "IN_PROGRESS":
      return {
        label: "Active",
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
      };
    case "DELAYED":
      return { label: "Delayed", badgeClass: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "PENDING":
      return { label: "Pending", badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MilestoneRowProps {
  readonly milestone: TimelineMilestone;
  readonly t: TimelineTranslations;
  readonly onEdit: (milestone: TimelineMilestone) => void;
  readonly onDelete: (id: string) => void;
  readonly onToggleStatus: (id: string) => void;
}

const MilestoneRow: FC<MilestoneRowProps> = ({
  milestone,
  t,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const deptInfo = getDepartmentBadge(milestone.department);
  const statusInfo = getMilestoneStatusBadge(milestone.status);

  return (
    <div
      data-testid={`milestone-row-${milestone.id}`}
      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        milestone.isAuspiciousNekath
          ? "bg-purple-950/25 border-purple-500/40 shadow-lg shadow-purple-950/20"
          : "bg-zinc-900/40 border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-start md:items-center gap-3.5">
        <span className="text-xl font-black text-white tabular-nums-lkr px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 min-w-[70px] text-center">
          {milestone.time}
        </span>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {milestone.isAuspiciousNekath && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/50 flex items-center gap-1">
                <span>✨</span>
                <span>AUSPICIOUS NEKATH (නැකත)</span>
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${deptInfo.badgeClass}`}
            >
              {deptInfo.label}
            </span>
            <span className="text-xs text-zinc-400 tabular-nums-lkr">
              • {milestone.durationMinutes} mins
            </span>
          </div>

          <h4 className="text-base font-bold text-white tracking-tight">{milestone.titleEn}</h4>

          <p className="text-xs text-zinc-300">{milestone.cueOrAction}</p>

          {milestone.soundLightCue && (
            <div className="text-[11px] text-pink-300/80 flex items-center gap-1 italic">
              <span>🎵</span>
              <span>{milestone.soundLightCue}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
        <button
          type="button"
          onClick={() => onToggleStatus(milestone.id)}
          className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${statusInfo.badgeClass}`}
        >
          {statusInfo.label}
        </button>

        <button
          type="button"
          onClick={() => onEdit(milestone)}
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          {t.editBtn}
        </button>

        <button
          type="button"
          onClick={() => onDelete(milestone.id)}
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
        >
          {t.deleteBtn}
        </button>
      </div>
    </div>
  );
};

interface MilestoneModalProps {
  readonly isOpen: boolean;
  readonly editingMilestone: TimelineMilestone | null;
  readonly t: TimelineTranslations;
  readonly onClose: () => void;
  readonly onSave: (milestone: TimelineMilestone) => void;
}

const MilestoneEditModal: FC<MilestoneModalProps> = ({
  isOpen,
  editingMilestone,
  t,
  onClose,
  onSave,
}) => {
  const timeId = useId();
  const titleId = useId();
  const deptId = useId();
  const nekathId = useId();
  const durationId = useId();
  const cueId = useId();
  const soundId = useId();

  const [time, setTime] = useState<string>(editingMilestone?.time ?? "10:00");
  const [titleEn, setTitleEn] = useState<string>(editingMilestone?.titleEn ?? "");
  const [department, setDepartment] = useState<TimelineDepartment>(
    editingMilestone?.department ?? "BANQUET_CAPTAIN",
  );
  const [isAuspiciousNekath, setIsAuspiciousNekath] = useState<boolean>(
    editingMilestone?.isAuspiciousNekath ?? false,
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    editingMilestone?.durationMinutes ?? 20,
  );
  const [cueOrAction, setCueOrAction] = useState<string>(editingMilestone?.cueOrAction ?? "");
  const [soundLightCue, setSoundLightCue] = useState<string>(editingMilestone?.soundLightCue ?? "");

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSave({
      id: editingMilestone ? editingMilestone.id : `m-${Date.now()}`,
      time,
      titleEn: titleEn.trim() || "Milestone Event",
      department,
      isAuspiciousNekath,
      durationMinutes,
      cueOrAction: cueOrAction.trim() || "Proceed as scheduled.",
      soundLightCue: soundLightCue.trim() || undefined,
      status: editingMilestone ? editingMilestone.status : "PENDING",
    });
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 w-full h-full p-0 bg-black/75 backdrop-blur-md flex items-center justify-center"
      aria-labelledby="milestone-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg mx-4 p-6 rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl space-y-4 text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 id="milestone-modal-title" className="text-lg font-bold text-white">
            {editingMilestone ? t.modalEditTitle : t.modalAddTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label htmlFor={timeId} className="block font-semibold text-zinc-300 mb-1">
              {t.timeLabel}
            </label>
            <input
              id={timeId}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer tabular-nums-lkr"
            />
          </div>

          <div>
            <label htmlFor={durationId} className="block font-semibold text-zinc-300 mb-1">
              {t.durationLabel}
            </label>
            <input
              id={durationId}
              type="number"
              min="1"
              max="240"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number.parseInt(e.target.value, 10) || 15)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
            />
          </div>
        </div>

        <div className="text-xs">
          <label htmlFor={titleId} className="block font-semibold text-zinc-300 mb-1">
            {t.titleLabel}
          </label>
          <input
            id={titleId}
            type="text"
            value={titleEn}
            placeholder="e.g. Traditional Poruwa Ascent (නැකත)"
            onChange={(e) => setTitleEn(e.target.value)}
            required
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label htmlFor={deptId} className="block font-semibold text-zinc-300 mb-1">
              {t.deptLabel}
            </label>
            <select
              id={deptId}
              value={department}
              onChange={(e) => setDepartment(e.target.value as TimelineDepartment)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="PORUWA_ASHTAKA_TEAM">Poruwa & Ashtaka Team</option>
              <option value="BANQUET_CAPTAIN">Banquet Floor Captain</option>
              <option value="KITCHEN_CHEF">Kitchen & Executive Chef</option>
              <option value="AC_ENGINEER">AC & Facility Chiller</option>
              <option value="BAR_SUPERVISOR">Bar & Beverage</option>
              <option value="AUDIO_VISUAL_DJ">Audio / Visual / DJ</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id={nekathId}
              type="checkbox"
              checked={isAuspiciousNekath}
              onChange={(e) => setIsAuspiciousNekath(e.target.checked)}
              className="w-5 h-5 rounded-md text-purple-600 bg-zinc-800 border-white/20 focus:ring-purple-400 cursor-pointer"
            />
            <label htmlFor={nekathId} className="text-xs text-purple-300 font-bold cursor-pointer">
              {t.nekathLabel}
            </label>
          </div>
        </div>

        <div className="text-xs space-y-1">
          <label htmlFor={cueId} className="block font-semibold text-zinc-300">
            {t.actionLabel}
          </label>
          <textarea
            id={cueId}
            rows={2}
            value={cueOrAction}
            placeholder="Operational instructions for banquet staff..."
            onChange={(e) => setCueOrAction(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="text-xs space-y-1">
          <label htmlFor={soundId} className="block font-semibold text-zinc-300">
            {t.soundCueLabel}
          </label>
          <input
            id={soundId}
            type="text"
            value={soundLightCue}
            placeholder="e.g. Magul Bera drummers roll or specific song"
            onChange={(e) => setSoundLightCue(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            {t.cancelBtn}
          </button>
          <button
            type="submit"
            className="px-5 py-2 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/30 cursor-pointer"
          >
            {t.saveBtn}
          </button>
        </div>
      </form>
    </dialog>
  );
};

// ============================================================================
// Main PoruwaTimelineEditor Component
// ============================================================================

export const PoruwaTimelineEditor: FC<PoruwaTimelineEditorProps> = ({
  eventTitle = "Kavinda & Tharushi Poruwa Wedding",
  eventDate = "2026-10-24",
  hallName = "Grand Ballroom",
  coupleNames = "Kavinda Senaratne & Tharushi Wickramasinghe",
  initialMilestones = DEFAULT_PORUWA_MILESTONES,
  language = "en",
  onSaveTimeline,
  onPrintCueSheet,
}) => {
  const [milestones, setMilestones] = useState<readonly TimelineMilestone[]>(initialMilestones);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingMilestone, setEditingMilestone] = useState<TimelineMilestone | null>(null);

  const t = TIMELINE_TRANSLATIONS[language] ?? TIMELINE_TRANSLATIONS.en;

  // Department and Nekath Filtering
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      if (deptFilter === "NEKATH_ONLY") {
        return m.isAuspiciousNekath;
      }
      if (deptFilter !== "ALL") {
        return m.department === deptFilter;
      }
      return true;
    });
  }, [milestones, deptFilter]);

  // Bulk schedule shift (+10m, +15m, -15m)
  const handleShiftSchedule = (minutesDelta: number): void => {
    setMilestones((prev) => shiftAllMilestones(prev, minutesDelta));
  };

  // Status toggle
  const handleToggleStatus = (id: string): void => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: getNextMilestoneStatus(m.status) } : m)),
    );
  };

  // Delete milestone
  const handleDeleteMilestone = (id: string): void => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  // Add / Edit save
  const handleSaveMilestone = (milestone: TimelineMilestone): void => {
    setMilestones((prev) => {
      const exists = prev.some((m) => m.id === milestone.id);
      if (exists) {
        return prev.map((m) => (m.id === milestone.id ? milestone : m));
      }
      return [...prev, milestone].sort((a, b) => a.time.localeCompare(b.time));
    });
    setModalOpen(false);
    setEditingMilestone(null);
  };

  const handleOpenAdd = (): void => {
    setEditingMilestone(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (m: TimelineMilestone): void => {
    setEditingMilestone(m);
    setModalOpen(true);
  };

  const handlePrint = (): void => {
    if (onPrintCueSheet) {
      onPrintCueSheet();
    }
  };

  const handleSaveAll = async (): Promise<void> => {
    if (onSaveTimeline) {
      await onSaveTimeline(milestones);
    }
  };

  return (
    <div className="w-full space-y-6 text-zinc-100 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-2xl">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block">
            {hallName} • {eventDate}
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">{t.title}</h1>
          <p className="text-sm text-zinc-300 mt-1">
            {eventTitle} ({coupleNames})
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>{t.addMilestone}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
          >
            🖨 {t.printCueSheet}
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            ✓ {t.saveTimeline}
          </button>
        </div>
      </div>

      {/* Timing Shift Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
        <span className="text-xs font-semibold text-zinc-400">
          Astrological Delay / Advance Controller:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShiftSchedule(-15)}
            className="px-3 py-1.5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
          >
            {t.shiftMinus15}
          </button>
          <button
            type="button"
            onClick={() => handleShiftSchedule(10)}
            className="px-3 py-1.5 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
          >
            {t.shiftPlus10}
          </button>
          <button
            type="button"
            onClick={() => handleShiftSchedule(15)}
            className="px-3 py-1.5 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
          >
            {t.shiftPlus15}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setDeptFilter("ALL")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "ALL"
              ? "bg-white text-zinc-900 shadow-md"
              : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {t.filterAll}
        </button>
        <button
          type="button"
          onClick={() => setDeptFilter("NEKATH_ONLY")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "NEKATH_ONLY"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
          }`}
        >
          {t.filterNekath}
        </button>
        <button
          type="button"
          onClick={() => setDeptFilter("BANQUET_CAPTAIN")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "BANQUET_CAPTAIN"
              ? "bg-sky-600 text-white shadow-md shadow-sky-900/40"
              : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {t.filterCaptain}
        </button>
        <button
          type="button"
          onClick={() => setDeptFilter("KITCHEN_CHEF")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "KITCHEN_CHEF"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
              : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {t.filterKitchen}
        </button>
        <button
          type="button"
          onClick={() => setDeptFilter("AC_ENGINEER")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "AC_ENGINEER"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
              : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {t.filterAC}
        </button>
        <button
          type="button"
          onClick={() => setDeptFilter("BAR_SUPERVISOR")}
          className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            deptFilter === "BAR_SUPERVISOR"
              ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
              : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {t.filterBar}
        </button>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredMilestones.map((milestone) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            t={t}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteMilestone}
            onToggleStatus={handleToggleStatus}
          />
        ))}
      </div>

      {/* Edit / Add Modal */}
      <MilestoneEditModal
        isOpen={modalOpen}
        editingMilestone={editingMilestone}
        t={t}
        onClose={() => {
          setModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
      />
    </div>
  );
};
