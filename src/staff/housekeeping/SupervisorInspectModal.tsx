import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Room Inspection Checklist Modal for Housekeeping Supervisors (SupervisorInspectModal.tsx)
 *
 * Dedicated modal for executive housekeepers and floor supervisors inspecting
 * turned-over rooms before releasing them to Front Desk as 'INSPECTED'.
 *
 * Operational & Hospitality Standards:
 * - 6-Point Tropical Hotel Checklist:
 * 1. AC & Ceiling Fan (Cooling 22-24°C, whisper-quiet operation)
 * 2. Mosquito Net / Repellent (Net tucked, vaporizer filled)
 * 3. Ceylon Tea/Coffee Tray (Pure Ceylon BOPF tea & water restocked)
 * 4. Bathroom Sanitization (Drain clean, seals intact, amenities fresh)
 * 5. Room QR Stand (Bedside acrylic stand clean, unscratched & scannable)
 * 6. Digital Safe Unlocked (Safe door open, factory code reset for arriving guest)
 * - 1-Tap "Pass All 6 Points" express shortcut for seasoned supervisors
 * - Rejection workflow ("Send Back to Attendant for Touch-Up") with deficiency notes
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple HIG Liquid Glass styling (.apple-liquid-glass, >= 44x44pt touch targets, continuous squircles)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type InspectionPointKey =
  | "AC_FAN"
  | "MOSQUITO_NET"
  | "CEYLON_TEA_TRAY"
  | "BATHROOM_SEAL"
  | "QR_STAND"
  | "SAFE_UNLOCKED";

export type InspectionStatus = "PASSED" | "FAILED" | "PENDING";

export interface InspectionChecklistItem {
  readonly key: InspectionPointKey;
  readonly titleEn: string;
  readonly titleSi: string;
  readonly titleTa: string;
  readonly descriptionEn: string;
  readonly descriptionSi: string;
  readonly descriptionTa: string;
  readonly icon: string;
}

export interface InspectionApprovalResult {
  readonly inspectionId: string;
  readonly roomId: string;
  readonly roomNumber: string;
  readonly supervisorName: string;
  readonly attendantName: string;
  readonly inspectedAtIso: string;
  readonly checklistResults: Readonly<Record<InspectionPointKey, InspectionStatus>>;
  readonly notes?: string | undefined;
}

export interface InspectionRejectionResult {
  readonly inspectionId: string;
  readonly roomId: string;
  readonly roomNumber: string;
  readonly supervisorName: string;
  readonly attendantName: string;
  readonly rejectedAtIso: string;
  readonly failedPoints: readonly InspectionPointKey[];
  readonly rejectionReason: string;
}

export interface SupervisorInspectModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly roomId: string;
  readonly roomNumber: string;
  readonly roomTypeName?: string | undefined;
  readonly attendantName?: string | undefined;
  readonly guestName?: string | undefined;
  readonly arrivalTime?: string | undefined;
  readonly supervisorName?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onApproveInspected: (result: InspectionApprovalResult) => Promise<void> | void;
  readonly onRejectBackToAttendant: (result: InspectionRejectionResult) => Promise<void> | void;
}

// ============================================================================
// 6-Point Tropical Checklist Definition
// ============================================================================

export const TROPICAL_INSPECTION_CHECKLIST: readonly InspectionChecklistItem[] = [
  {
    key: "AC_FAN",
    titleEn: "AC & Ceiling Fan Test",
    titleSi: "වායු සමීකරණ හා විදුලි පංකා පරීක්ෂාව",
    titleTa: "ஏசி & மின்விசிறி சோதனை",
    descriptionEn: "AC set to 22-24°C, remote operational, ceiling fan whisper-quiet.",
    descriptionSi: "වායු සමීකරණය 22-24°C ට සැකසීම, දුරස්ථ පාලකය ක්රියාකාරීයි, විදුලි පංකාව නිහඬයි.",
    descriptionTa: "ஏசி 22-24°C இல் அமைக்கப்பட்டு, மின்விசிறி சத்தமின்றி இயங்குகிறது.",
    icon: "AC",
  },
  {
    key: "MOSQUITO_NET",
    titleEn: "Mosquito Net & Vaporizer",
    titleSi: "මදුරු දැල් සහ වාෂ්පකාරක",
    titleTa: "கொசு வலை & விரட்டி",
    descriptionEn: "Four-poster canopy net tucked cleanly, liquid repellent refilled.",
    descriptionSi: "මදුරු දැල පිළිවෙලට සකසා ඇත, විද්යුත් මදුරු දියරය පිරවා ඇත.",
    descriptionTa: "கொசு வலை சரியாக பொருத்தப்பட்டுள்ளது, திரவ விரட்டி நிரப்பப்பட்டுள்ளது.",
    icon: "Eco",
  },
  {
    key: "CEYLON_TEA_TRAY",
    titleEn: "Ceylon BOPF Tea Tray & Water",
    titleSi: "සීලෝන් තේ තැටිය සහ පානීය ජලය",
    titleTa: "சிலோன் தேநீர் தட்டு & குடிநீர்",
    descriptionEn:
      "Fresh Ceylon tea sachets, sugar cubes, electric kettle clean, 2x artesian water.",
    descriptionSi: "නැවුම් ලංකා තේ පැකට්, සීනි, කේතලය පිරිසිදුයි, ජල බෝතල් 2 සම්පූර්ණයි.",
    descriptionTa: "புதிய தேநீர் பாக்கெட்டுகள், சர்க்கரை, கெட்டில் சுத்தமானது, 2 குடிநீர் பாட்டில்கள்.",
    icon: "Coffee",
  },
  {
    key: "BATHROOM_SEAL",
    titleEn: "Bathroom Sanitization & Seal",
    titleSi: "නානකාමර විෂබීජහරණය සහ මුද්රාව",
    titleTa: "குளியலறை சுகாதாரம் & முத்திரை",
    descriptionEn: "Hair-free drains, dry glass cubicle, toilet sanitization band applied.",
    descriptionSi: "කාණු පිරිසිදුයි, වීදුරුව වියළියි, වැසිකිළි විෂබීජහරණ පටිය යොදා ඇත.",
    descriptionTa: "வடிகால் சுத்தமானது, கண்ணாடி உலர்வானது, கழிப்பறை முத்திரை இடப்பட்டுள்ளது.",
    icon: "Clean",
  },
  {
    key: "QR_STAND",
    titleEn: "Bedside Room QR Stand",
    titleSi: "ඇඳ අසල QR කේත ස්ථාවරය",
    titleTa: "அறை QR குறியீடு பலகை",
    descriptionEn: "Acrylic bedside stand clean, upright, and camera scan confirmed.",
    descriptionSi: "ඇඳ අසල ඇති QR ස්ථාවරය පිරිසිදුයි, ස්කෑන් කිරීම තහවුරු කළා.",
    descriptionTa: "படுக்கை அருகிலுள்ள QR பலகை சுத்தமாக உள்ளது, ஸ்கேன் செய்யக்கூடியது.",
    icon: "Mobile",
  },
  {
    key: "SAFE_UNLOCKED",
    titleEn: "Digital Safe Open & Reset",
    titleSi: "ඩිජිටල් සුරක්ෂිතාගාරය විවෘතයි",
    titleTa: "டிஜிட்டல் பெட்டகம் திறந்துள்ளது",
    descriptionEn: "In-room safe door wide open, batteries verified, guest reset ready.",
    descriptionSi: "කාමරයේ සේප්පුව විවෘතයි, බැටරි පරීක්ෂා කර ඇත, අලුත් අමුත්තාට සූදානම්.",
    descriptionTa: "பெட்டகக் கதவு திறந்துள்ளது, பேட்டரி சரியானது, புதிய விருந்தினருக்கு தயார்.",
    icon: "Locked",
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface InspectionTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly inspectionBadge: string;
  readonly attendantLabel: string;
  readonly supervisorLabel: string;
  readonly progressLabel: string;
  readonly passAllAction: string;
  readonly approveAction: string;
  readonly rejectAction: string;
  readonly approving: string;
  readonly rejecting: string;
  readonly passStatus: string;
  readonly failStatus: string;
  readonly pendingStatus: string;
  readonly notesLabel: string;
  readonly notesPlaceholder: string;
  readonly closeAction: string;
  readonly successTitle: string;
  readonly successDesc: string;
  readonly rejectedTitle: string;
  readonly rejectedDesc: string;
  readonly allPassedRequired: string;
}

const INSPECTION_TRANSLATIONS: Record<SupportedLanguage, InspectionTranslations> = {
  en: {
    title: "Supervisor Room Inspection",
    subtitle: "6-Point Tropical Hospitality Clearance",
    inspectionBadge: "SUPERVISOR INSPECTION",
    attendantLabel: "Turnaround Attendant",
    supervisorLabel: "Inspecting Supervisor",
    progressLabel: "Inspection Progress",
    passAllAction: "Pass All 6 Points",
    approveAction: "Approve Room as INSPECTED",
    rejectAction: "Send Back for Touch-Up",
    approving: "Approving & Releasing...",
    rejecting: "Sending Back...",
    passStatus: "Passed",
    failStatus: "Failed",
    pendingStatus: "Pending",
    notesLabel: "Supervisor Observations / Touch-up Notes",
    notesPlaceholder: "e.g. AC remote batteries replaced, balcony glass wiped...",
    closeAction: "Close",
    successTitle: "Room Approved as INSPECTED",
    successDesc: "Room is now marked INSPECTED and ready for Front Desk check-in!",
    rejectedTitle: "Room Sent Back for Touch-Up",
    rejectedDesc: "Turnaround attendant notified of failed checklist points.",
    allPassedRequired: "All 6 inspection points must pass before approving.",
  },
  si: {
    title: "පරීක්ෂක කාමර පරීක්ෂාව",
    subtitle: "ලාංකික ආගන්තුක සත්කාර 6-ලක්ෂ්ය පරීක්ෂාව",
    inspectionBadge: "පරීක්ෂක පරීක්ෂාව",
    attendantLabel: "කාමර සේවක",
    supervisorLabel: "පරීක්ෂක නිලධාරී",
    progressLabel: "පරීක්ෂාවේ ප්රගතිය",
    passAllAction: "ලක්ෂ්ය 6 ම සමත් කරන්න",
    approveAction: "කාමරය පරීක්ෂා කළ බවට අනුමත කරන්න",
    rejectAction: "නැවත සකස් කිරීමට යවන්න",
    approving: "අනුමත කරමින්...",
    rejecting: "ආපසු යවමින්...",
    passStatus: "සමත්",
    failStatus: "අසමත්",
    pendingStatus: "ඉතිරිව ඇත",
    notesLabel: "පරීක්ෂක නිරීක්ෂණ / විශේෂ සටහන්",
    notesPlaceholder: "උදා: බැල්කනියේ වීදුරුව පිසදැමිය යුතුයි...",
    closeAction: "වසන්න",
    successTitle: "කාමරය පරීක්ෂා කළ බවට අනුමත විය",
    successDesc: "කාමරය පිළිගැනීමේ කවුන්ටරයට ලබාදීමට දැන් සම්පූර්ණයෙන් සූදානම්!",
    rejectedTitle: "කාමරය නැවත සකස් කිරීමට යවන ලදී",
    rejectedDesc: "අසමත් වූ කරුණු පිළිබඳව කාමර සේවකයා දැනුවත් කරන ලදී.",
    allPassedRequired: "අනුමත කිරීමට පෙර ලක්ෂ්ය 6 ම සමත් විය යුතුය.",
  },
  ta: {
    title: "மேற்பார்வையாளர் அறை ஆய்வு",
    subtitle: "6-அம்ச வெப்பமண்டல விருந்தோம்பல் ஆய்வு",
    inspectionBadge: "மேற்பார்வை ஆய்வு",
    attendantLabel: "அறை பணியாளர்",
    supervisorLabel: "ஆய்வு மேற்பார்வையாளர்",
    progressLabel: "ஆய்வு முன்னேற்றம்",
    passAllAction: "அனைத்து 6 அம்சங்களையும் ஏற்கவும்",
    approveAction: "அறையை ஆய்வுக்கு உட்பட்டதாக அங்கீகரிக்கவும்",
    rejectAction: "மீண்டும் சரிசெய்ய திருப்பி அனுப்பவும்",
    approving: "அங்கீகரிக்கப்படுகிறது...",
    rejecting: "திருப்பி அனுப்பப்படுகிறது...",
    passStatus: "வெற்றி",
    failStatus: "தோல்வி",
    pendingStatus: "நிலுவை",
    notesLabel: "மேற்பார்வையாளர் குறிப்புகள்",
    notesPlaceholder: "எ.கா: பால்கனி கண்ணாடி சுத்தம் செய்யப்பட வேண்டும்...",
    closeAction: "மூடு",
    successTitle: "அறை வெற்றிகரமாக அங்கீகரிக்கப்பட்டது",
    successDesc: "அறை இப்போது வரவேற்பறை சரிபார்ப்புக்கு தயாராக உள்ளது!",
    rejectedTitle: "அறை மீண்டும் சரிசெய்ய அனுப்பப்பட்டது",
    rejectedDesc: "பணியாளருக்கு தகவல் தெரிவிக்கப்பட்டது.",
    allPassedRequired: "அங்கீகரிப்பதற்கு முன் அனைத்து 6 அம்சங்களும் தேர்ச்சி பெற வேண்டும்.",
  },
};

export function getInspectionText(lang: SupportedLanguage = "en"): InspectionTranslations {
  return INSPECTION_TRANSLATIONS[lang] ?? INSPECTION_TRANSLATIONS.en;
}

// ============================================================================
// Pure Assessment Resolvers (Complexity <= 12)
// ============================================================================

export function countChecklistProgress(
  results: Readonly<Record<InspectionPointKey, InspectionStatus>>,
): { readonly passedCount: number; readonly failedCount: number; readonly allPassed: boolean } {
  let passedCount = 0;
  let failedCount = 0;

  for (const item of TROPICAL_INSPECTION_CHECKLIST) {
    const status = results[item.key];
    if (status === "PASSED") {
      passedCount += 1;
    } else if (status === "FAILED") {
      failedCount += 1;
    }
  }

  const allPassed = passedCount === TROPICAL_INSPECTION_CHECKLIST.length;

  return { passedCount, failedCount, allPassed };
}

export function getFailedPoints(
  results: Readonly<Record<InspectionPointKey, InspectionStatus>>,
): InspectionPointKey[] {
  const failed: InspectionPointKey[] = [];
  for (const item of TROPICAL_INSPECTION_CHECKLIST) {
    if (results[item.key] === "FAILED") {
      failed.push(item.key);
    }
  }
  return failed;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ModalHeaderProps {
  readonly roomNumber: string;
  readonly guestName?: string | undefined;
  readonly roomTypeName?: string | undefined;
  readonly attendantName: string;
  readonly t: InspectionTranslations;
  readonly onClose: () => void;
}

const ModalHeader: FC<ModalHeaderProps> = ({
  roomNumber,
  guestName,
  roomTypeName,
  attendantName,
  t,
  onClose,
}) => {
  return (
    <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30">
            {t.inspectionBadge}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {t.attendantLabel}: <strong className="text-slate-800">{attendantName}</strong>
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Room {roomNumber}</span>
          {guestName && <span className="text-sm font-normal text-slate-700">({guestName})</span>}
        </h2>
        {roomTypeName && <p className="text-xs text-slate-400 mt-0.5">{roomTypeName}</p>}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
        aria-label={t.closeAction}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label={t.closeAction}
        >
          <title>{t.closeAction}</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

interface ProgressSectionProps {
  readonly passedCount: number;
  readonly totalPoints: number;
  readonly allPassed: boolean;
  readonly t: InspectionTranslations;
  readonly onPassAll: () => void;
}

const ProgressSection: FC<ProgressSectionProps> = ({
  passedCount,
  totalPoints,
  allPassed,
  t,
  onPassAll,
}) => {
  const percentage = Math.round((passedCount / totalPoints) * 100);

  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-semibold text-slate-700">{t.progressLabel}</span>
          <span className="font-mono font-bold tabular-nums-lkr text-amber-700">
            {passedCount} / {totalPoints} ({percentage}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              allPassed ? "bg-emerald-400" : "bg-amber-400"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onPassAll}
        className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#0B6E4F] text-xs font-bold whitespace-nowrap active:scale-[0.98] transition-all flex items-center gap-1.5"
      >
        <span>{t.passAllAction}</span>
      </button>
    </div>
  );
};

export function resolveChecklistTitle(
  item: InspectionChecklistItem,
  lang: SupportedLanguage,
): string {
  switch (lang) {
    case "si":
      return item.titleSi;
    case "ta":
      return item.titleTa;
    default:
      return item.titleEn;
  }
}

export function resolveChecklistDescription(
  item: InspectionChecklistItem,
  lang: SupportedLanguage,
): string {
  switch (lang) {
    case "si":
      return item.descriptionSi;
    case "ta":
      return item.descriptionTa;
    default:
      return item.descriptionEn;
  }
}

export function resolveChecklistRowCardStyle(status: InspectionStatus): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-500/10 border-emerald-500/30";
    case "FAILED":
      return "bg-rose-500/10 border-rose-500/30";
    case "PENDING":
      return "bg-slate-50 border-[#E2E8F0] hover:border-[#E2E8F0]";
  }
}

export function resolveChecklistBadgeStyle(status: InspectionStatus): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30";
    case "FAILED":
      return "bg-rose-500/20 text-rose-800 border border-rose-500/30";
    case "PENDING":
      return "bg-amber-500/20 text-amber-800 border border-amber-500/30";
  }
}

export function resolveChecklistButtonStyle(status: InspectionStatus): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-500 text-slate-950 shadow-md";
    case "FAILED":
      return "bg-rose-500 text-white shadow-md";
    case "PENDING":
      return "bg-slate-50 text-slate-700 hover:bg-slate-50";
  }
}

export function resolveChecklistStatusText(
  status: InspectionStatus,
  t: InspectionTranslations,
): string {
  switch (status) {
    case "PASSED":
      return t.passStatus;
    case "FAILED":
      return t.failStatus;
    case "PENDING":
      return t.pendingStatus;
  }
}

export function resolveChecklistButtonIcon(status: InspectionStatus): string {
  switch (status) {
    case "PASSED":
      return "OK";
    case "FAILED":
      return "x";
    case "PENDING":
      return "○";
  }
}

interface ChecklistRowProps {
  readonly item: InspectionChecklistItem;
  readonly status: InspectionStatus;
  readonly lang: SupportedLanguage;
  readonly t: InspectionTranslations;
  readonly onToggleStatus: (key: InspectionPointKey) => void;
}

const ChecklistRow: FC<ChecklistRowProps> = ({ item, status, lang, t, onToggleStatus }) => {
  const title = resolveChecklistTitle(item, lang);
  const description = resolveChecklistDescription(item, lang);
  const cardStyle = resolveChecklistRowCardStyle(status);
  const badgeStyle = resolveChecklistBadgeStyle(status);
  const buttonStyle = resolveChecklistButtonStyle(status);
  const statusText = resolveChecklistStatusText(status, t);
  const icon = resolveChecklistButtonIcon(status);

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${cardStyle}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-2xl mt-0.5 flex-shrink-0">
          <DynamicTokenIcon token={item.icon} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 truncate">{title}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}
            >
              {statusText}
            </span>
          </div>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggleStatus(item.key)}
        className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-black text-sm flex items-center justify-center transition-all flex-shrink-0 active:scale-95 ${buttonStyle}`}
        aria-label={`Toggle inspection status for ${title}`}
      >
        {icon}
      </button>
    </div>
  );
};

interface ResultOverlayProps {
  readonly isApproved: boolean;
  readonly roomNumber: string;
  readonly t: InspectionTranslations;
  readonly onClose: () => void;
}

const ResultOverlay: FC<ResultOverlayProps> = ({ isApproved, roomNumber, t, onClose }) => {
  return (
    <div className="p-6 text-center space-y-4">
      <div
        className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl border ${
          isApproved
            ? "bg-emerald-500/20 border-emerald-500/30 text-[#0B6E4F]"
            : "bg-rose-500/20 border-rose-500/30 text-rose-800"
        }`}
      >
        {isApproved ? "OK" : "x"}
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          {isApproved ? t.successTitle : t.rejectedTitle}
        </h3>
        <p className="text-xs text-slate-700 mt-1">{isApproved ? t.successDesc : t.rejectedDesc}</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-700 text-left space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Room Number</span>
          <span className="font-bold text-slate-900">#{roomNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status Assigned</span>
          <span className={`font-bold ${isApproved ? "text-[#0B6E4F]" : "text-rose-800"}`}>
            {isApproved ? "INSPECTED" : "TOUCH_UP / DIRTY"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[48px] rounded-2xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold transition-all active:scale-[0.98]"
      >
        {t.closeAction}
      </button>
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const SupervisorInspectModal: FC<SupervisorInspectModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomNumber,
  roomTypeName,
  attendantName = "Room Attendant",
  guestName,
  supervisorName = "Housekeeping Supervisor",
  language = "en",
  onApproveInspected,
  onRejectBackToAttendant,
}) => {
  const notesId = useId();
  const t = getInspectionText(language);

  const [results, setResults] = useState<Record<InspectionPointKey, InspectionStatus>>({
    AC_FAN: "PENDING",
    MOSQUITO_NET: "PENDING",
    CEYLON_TEA_TRAY: "PENDING",
    BATHROOM_SEAL: "PENDING",
    QR_STAND: "PENDING",
    SAFE_UNLOCKED: "PENDING",
  });

  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedStatus, setCompletedStatus] = useState<"APPROVED" | "REJECTED" | null>(null);

  const { passedCount, allPassed } = useMemo(() => {
    return countChecklistProgress(results);
  }, [results]);

  if (!isOpen) return null;

  const handleToggleStatus = (key: InspectionPointKey) => {
    setResults((prev) => {
      const current = prev[key];
      const next: InspectionStatus =
        current === "PENDING" ? "PASSED" : current === "PASSED" ? "FAILED" : "PENDING";
      return { ...prev, [key]: next };
    });
  };

  const handlePassAll = () => {
    setResults({
      AC_FAN: "PASSED",
      MOSQUITO_NET: "PASSED",
      CEYLON_TEA_TRAY: "PASSED",
      BATHROOM_SEAL: "PASSED",
      QR_STAND: "PASSED",
      SAFE_UNLOCKED: "PASSED",
    });
  };

  const handleApprove = async () => {
    if (!allPassed) return;
    setIsSubmitting(true);

    const payload: InspectionApprovalResult = {
      inspectionId: `ins-app-${Date.now()}`,
      roomId,
      roomNumber,
      supervisorName,
      attendantName,
      inspectedAtIso: new Date().toISOString(),
      checklistResults: results,
      notes: notes.trim() || undefined,
    };

    try {
      await onApproveInspected(payload);
      playOrderBell("PAYMENT_CONFIRMED");
      setCompletedStatus("APPROVED");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    const failedPoints = getFailedPoints(results);

    const payload: InspectionRejectionResult = {
      inspectionId: `ins-rej-${Date.now()}`,
      roomId,
      roomNumber,
      supervisorName,
      attendantName,
      rejectedAtIso: new Date().toISOString(),
      failedPoints: failedPoints.length > 0 ? failedPoints : ["AC_FAN"],
      rejectionReason: notes.trim() || "Items need further touch-up before room clearance.",
    };

    try {
      await onRejectBackToAttendant(payload);
      playOrderBell("URGENT");
      setCompletedStatus("REJECTED");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="supervisor-inspection-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity animate-in fade-in border-0 w-full h-full max-w-none max-h-none m-0"
    >
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass shadow-2xl overflow-hidden">
        {completedStatus ? (
          <ResultOverlay
            isApproved={completedStatus === "APPROVED"}
            roomNumber={roomNumber}
            t={t}
            onClose={() => {
              setCompletedStatus(null);
              onClose();
            }}
          />
        ) : (
          <>
            {/* Modal Header */}
            <div className="p-4 sm:p-5 flex-shrink-0">
              <ModalHeader
                roomNumber={roomNumber}
                guestName={guestName}
                roomTypeName={roomTypeName}
                attendantName={attendantName}
                t={t}
                onClose={onClose}
              />
            </div>

            {/* Progress Bar & Pass-All Shortcut */}
            <div className="px-4 sm:px-5 pb-3 flex-shrink-0">
              <ProgressSection
                passedCount={passedCount}
                totalPoints={TROPICAL_INSPECTION_CHECKLIST.length}
                allPassed={allPassed}
                t={t}
                onPassAll={handlePassAll}
              />
            </div>

            {/* Scrollable Checklist */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-2 space-y-2.5">
              {TROPICAL_INSPECTION_CHECKLIST.map((item) => (
                <ChecklistRow
                  key={item.key}
                  item={item}
                  status={results[item.key]}
                  lang={language}
                  t={t}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>

            {/* Notes & Action Toolbar */}
            <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-white backdrop-blur-md space-y-3 flex-shrink-0">
              <div>
                <label
                  htmlFor={notesId}
                  className="block text-[11px] font-semibold text-slate-400 mb-1"
                >
                  {t.notesLabel}
                </label>
                <input
                  id={notesId}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="min-h-[48px] px-3 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <span>x</span>
                  <span className="truncate">{isSubmitting ? t.rejecting : t.rejectAction}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting || !allPassed}
                  className={`min-h-[48px] px-3 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-md ${
                    allPassed
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-slate-50 text-slate-500 border border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title={!allPassed ? t.allPassedRequired : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>{t.approving}</span>
                    </>
                  ) : (
                    <>
                      <span className="truncate">{t.approveAction}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
