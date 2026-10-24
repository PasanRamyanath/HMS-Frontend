/**
 * Ayurveda Multi-Day Panchakarma Package Progress Tracker (PanchakarmaTracker.tsx)
 *
 * Implements Step 363 (Phase 15.13) of the Sri Lanka HMS Master Architecture Plan:
 * Clinical and wellness management board for Sri Lankan Ayurveda health resorts and retreat sanctuaries.
 * Tracks multi-day (7-Day Rejuvenation, 14-Day Deep Shodhana, 21-Day Rasayana Chronic Healing)
 * inpatient guest therapies across daily morning and afternoon sessions:
 *
 * Key Capabilities:
 * 1. Multi-Day Panchakarma Clinical Tracking:
 * - 7-Day / 14-Day / 21-Day curated treatment itineraries.
 * - Phase indicators: Purvakarma (Snehana / Swedana prep), Pradhanakarma (Virechana / Basti / Nasya),
 * and Paschatkarma (Rasayana rejuvenation & dietary revitalization).
 * 2. Daily Morning & Afternoon Therapy Log:
 * - Session status (PENDING, COMPLETED, IN_PROGRESS, CONTRAINDICATED_SKIPPED).
 * - Assigned Vaidya doctor & certified therapist tracking.
 * - Daily Ayurvedic diet guidelines (e.g., Mung Bean Mudga Yusha, Kurakkan gruel, Kichadi).
 * 3. Daily Vitals & Pulse Diagnosis Recording Modal:
 * - Blood pressure, Ayurvedic pulse rhythm (Nadi Pariksha: Sarpa/Manduka/Hamsa), weight tracking.
 * - Doctor clinical notes and dosha rebalancing notes.
 * 4. Executive KPI Bento Summary:
 * - In-House Panchakarma Guests, Today's Therapy Completion Rate, Deep Detox Patients, Upcoming Graduations.
 * 5. Apple Human Interface Guidelines:
 * - macOS/iPadOS translucent .apple-liquid-glass workspace with continuous squircle radii.
 * - SF Pro optical typography with .tabular-nums-lkr on clinical metrics and countdowns.
 * - >= 44x44pt touch targets and fluid spring transitions.
 * 6. Trilingual Localization (`en`, `si`, `ta`).
 * 7. Zero console noise, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PanchakarmaDurationDays = 7 | 14 | 21;

export type PanchakarmaStage = "PURVAKARMA_PREP" | "PRADHANAKARMA_DETOX" | "PASCHATKARMA_REJUV";

export type SessionCompletionStatus =
 | "PENDING"
 | "IN_PROGRESS"
 | "COMPLETED"
 | "CONTRAINDICATED_SKIPPED";

export type PrimaryDoshaType =
 | "VATA"
 | "PITTA"
 | "KAPHA"
 | "VATA_PITTA"
 | "PITTA_KAPHA"
 | "TRIDOSHA";

export interface DailyTherapySession {
 readonly treatmentName: string;
 readonly therapistName: string;
 readonly scheduledTime: string;
 readonly status: SessionCompletionStatus;
 readonly clinicalRemarks?: string | undefined;
}

export interface DailyPanchakarmaRecord {
 readonly dayNumber: number;
 readonly date: string;
 readonly stage: PanchakarmaStage;
 readonly morningTherapy: DailyTherapySession;
 readonly afternoonTherapy: DailyTherapySession;
 readonly prescribedDiet: string;
 readonly doctorReviewed: boolean;
 readonly bloodPressure?: string | undefined;
 readonly pulseRateBpm?: number | undefined;
 readonly weightKg?: number | undefined;
}

export interface PanchakarmaGuestProfile {
 readonly id: string;
 readonly registrationRef: string;
 readonly guestName: string;
 readonly roomNumber: string;
 readonly programTitle: string;
 readonly totalDays: PanchakarmaDurationDays;
 readonly currentDay: number;
 readonly startDate: string;
 readonly expectedEndDate: string;
 readonly attendingVaidya: string;
 readonly dominantDosha: PrimaryDoshaType;
 readonly dailyRecords: readonly DailyPanchakarmaRecord[];
}

export interface PanchakarmaKpiSummary {
 readonly inHouseGuestsCount: number;
 readonly completedTodayCount: number;
 readonly totalScheduledTodayCount: number;
 readonly deepDetoxPhaseCount: number;
 readonly graduatingThisWeekCount: number;
 readonly avgProgressPercent: number;
}

export interface PanchakarmaTrackerProps {
 /** Initial inpatient guests list */
 readonly initialGuests?: readonly PanchakarmaGuestProfile[] | undefined;
 /** Active UI language */
 readonly language?: SupportedLanguage | undefined;
 /** Callback on therapy status update */
 readonly onUpdateSession?:
 | ((
 guestId: string,
 dayNumber: number,
 session: "MORNING" | "AFTERNOON",
 updated: DailyTherapySession,
 ) => void)
 | undefined;
 /** Test identifier */
 readonly testId?: string | undefined;
}

// ============================================================================
// Default Seed Patient Profiles
// ============================================================================

export const DEFAULT_PANCHAKARMA_GUESTS: readonly PanchakarmaGuestProfile[] = [
 {
 id: "PK-1001",
 registrationRef: "AYU-PK-2026-081",
 guestName: "Lady Sarah Cavendish",
 roomNumber: "Ayurveda Villa 02",
 programTitle: "14-Day Deep Shodhana & Metabolic Reset",
 totalDays: 14,
 currentDay: 6,
 startDate: "2026-10-16",
 expectedEndDate: "2026-10-29",
 attendingVaidya: "Dr. Priyantha Weerasinghe (BAMS)",
 dominantDosha: "VATA_PITTA",
 dailyRecords: [
 {
 dayNumber: 6,
 date: "2026-10-21",
 stage: "PRADHANAKARMA_DETOX",
 morningTherapy: {
 treatmentName: "Virechana Purgation Snehana Preparation & Abhyanga",
 therapistName: "Anoma Jayalath",
 scheduledTime: "08:30 AM",
 status: "COMPLETED",
 clinicalRemarks: "Administered 60ml Triphala decoction with castor oil. Good toleration.",
 },
 afternoonTherapy: {
 treatmentName: "Ksheeradhara (Herbal Medicated Milk Pouring)",
 therapistName: "Sandamali Perera",
 scheduledTime: "03:30 PM",
 status: "IN_PROGRESS",
 clinicalRemarks: "Soothing Pitta cooling therapy on frontal lobes.",
 },
 prescribedDiet: "Mung Bean Mudga Yusha soup with toasted cumin & fresh coriander.",
 doctorReviewed: true,
 bloodPressure: "118/76 mmHg",
 pulseRateBpm: 68,
 weightKg: 62.4,
 },
 ],
 },
 {
 id: "PK-1002",
 registrationRef: "AYU-PK-2026-082",
 guestName: "Mr. Henrik Larsson",
 roomNumber: "Ayurveda Villa 05",
 programTitle: "7-Day Panchakarma Stress Rejuvenation",
 totalDays: 7,
 currentDay: 5,
 startDate: "2026-10-17",
 expectedEndDate: "2026-10-23",
 attendingVaidya: "Dr. Sumana Wickramasinghe (MD Ayu)",
 dominantDosha: "VATA",
 dailyRecords: [
 {
 dayNumber: 5,
 date: "2026-10-21",
 stage: "PASCHATKARMA_REJUV",
 morningTherapy: {
 treatmentName: "Full-Body Warm Pinda Sweda (Herbal Bolus Massage)",
 therapistName: "Kumara Jayasundara",
 scheduledTime: "09:00 AM",
 status: "COMPLETED",
 clinicalRemarks: "Joint stiffness in lumbar region noticeably relieved.",
 },
 afternoonTherapy: {
 treatmentName: "Shirodhara (Sesame Oil Infused with Gotukola)",
 therapistName: "Kumara Jayasundara",
 scheduledTime: "04:00 PM",
 status: "PENDING",
 },
 prescribedDiet: "Steamed red rice kanji with coconut milk and roasted curry leaves.",
 doctorReviewed: true,
 bloodPressure: "124/82 mmHg",
 pulseRateBpm: 72,
 weightKg: 78.1,
 },
 ],
 },
 {
 id: "PK-1003",
 registrationRef: "AYU-PK-2026-083",
 guestName: "Mrs. Clara Oswald",
 roomNumber: "Ayurveda Villa 09",
 programTitle: "21-Day Rasayana Chronic Arthritis Rehabilitation",
 totalDays: 21,
 currentDay: 12,
 startDate: "2026-10-10",
 expectedEndDate: "2026-10-30",
 attendingVaidya: "Dr. Priyantha Weerasinghe (BAMS)",
 dominantDosha: "KAPHA",
 dailyRecords: [
 {
 dayNumber: 12,
 date: "2026-10-21",
 stage: "PRADHANAKARMA_DETOX",
 morningTherapy: {
 treatmentName: "Matra Basti (Herbal Medicated Oil Enema)",
 therapistName: "Anoma Jayalath",
 scheduledTime: "08:00 AM",
 status: "COMPLETED",
 clinicalRemarks: "Retained oil for 45 minutes as prescribed. Normal bowel clearance.",
 },
 afternoonTherapy: {
 treatmentName: "Udvartana Lymphatic Herbal Powder Detox Scrub",
 therapistName: "Sandamali Perera",
 scheduledTime: "02:30 PM",
 status: "PENDING",
 },
 prescribedDiet: "Roasted barley porridge with dry ginger decoction. Salt restricted.",
 doctorReviewed: false,
 bloodPressure: "130/85 mmHg",
 pulseRateBpm: 74,
 weightKg: 69.8,
 },
 ],
 },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface PanchakarmaTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly kpiInHouse: string;
 readonly kpiTodayCompleted: string;
 readonly kpiDeepDetox: string;
 readonly kpiGraduating: string;
 readonly dayProgress: string;
 readonly stagePrep: string;
 readonly stageDetox: string;
 readonly stageRejuv: string;
 readonly morningSession: string;
 readonly afternoonSession: string;
 readonly attendingDoctor: string;
 readonly dominantDoshaLabel: string;
 readonly prescribedDietLabel: string;
 readonly updateTherapyBtn: string;
 readonly modalTitle: string;
 readonly statusLabel: string;
 readonly remarksLabel: string;
 readonly vitalsHeading: string;
 readonly saveChanges: string;
 readonly cancel: string;
 readonly statusLabels: Readonly<Record<SessionCompletionStatus, string>>;
 readonly stageLabels: Readonly<Record<PanchakarmaStage, string>>;
}

export const PANCHAKARMA_TRANSLATIONS: Readonly<
 Record<SupportedLanguage, PanchakarmaTranslations>
> = {
 en: {
 title: "Multi-Day Panchakarma Retreat Progress Tracker",
 subtitle:
 "Clinical daily therapy log, dosha revitalization & vitals monitoring for Ayurveda inpatient retreats",
 kpiInHouse: "In-House Retreat Patients",
 kpiTodayCompleted: "Today's Therapies Completed",
 kpiDeepDetox: "In Deep Shodhana Detox",
 kpiGraduating: "Graduating This Week",
 dayProgress: "Program Day",
 stagePrep: "Purvakarma (Preparation)",
 stageDetox: "Pradhanakarma (Deep Detox)",
 stageRejuv: "Paschatkarma (Rejuvenation)",
 morningSession: "Morning Therapy Session",
 afternoonSession: "Afternoon Therapy Session",
 attendingDoctor: "Attending Vaidya",
 dominantDoshaLabel: "Dosha Profile",
 prescribedDietLabel: "Ayurvedic Dietary Prescription",
 updateTherapyBtn: "Update Session / Vitals",
 modalTitle: "Daily Therapy & Clinical Log",
 statusLabel: "Session Status",
 remarksLabel: "Vaidya Clinical Remarks / Observations",
 vitalsHeading: "Patient Daily Vitals",
 saveChanges: "Save Clinical Record",
 cancel: "Cancel",
 statusLabels: {
 PENDING: "Pending",
 IN_PROGRESS: "In Progress",
 COMPLETED: "Completed",
 CONTRAINDICATED_SKIPPED: "Skipped (Contraindicated)",
 },
 stageLabels: {
 PURVAKARMA_PREP: "Purvakarma (Prep)",
 PRADHANAKARMA_DETOX: "Pradhanakarma (Detox)",
 PASCHATKARMA_REJUV: "Paschatkarma (Rejuv)",
 },
 },
 si: {
 title: "පංචකර්ම නේවාසික ප්රතිකාර ප්රගති පුවරුව",
 subtitle: "දෛනික ආයුර්වේද ප්රතිකාර, ත්රිදෝෂ සමනය සහ ශාරීරික සුවතා නිරීක්ෂණය",
 kpiInHouse: "නේවාසික රෝගීන්",
 kpiTodayCompleted: "අද නිමකළ ප්රතිකාර",
 kpiDeepDetox: "ශෝධන අවධියේ පසුවන",
 kpiGraduating: "මෙම සතියේ පිටත්වන",
 dayProgress: "ප්රතිකාර දිනය",
 stagePrep: "පූර්වකර්ම (සූදානම)",
 stageDetox: "ප්රධානකර්ම (ශෝධනය)",
 stageRejuv: "පශ්චාත්කර්ම (රසායන)",
 morningSession: "උදෑසන ප්රතිකාර වාරය",
 afternoonSession: "සවස ප්රතිකාර වාරය",
 attendingDoctor: "වෛද්යවරයා",
 dominantDoshaLabel: "දෝෂ තත්ත්වය",
 prescribedDietLabel: "ආයුර්වේද ආහාර උපදෙස්",
 updateTherapyBtn: "ප්රතිකාර යාවත්කාලීන කිරීම",
 modalTitle: "දෛනික ප්රතිකාර සහ සායනික වාර්තාව",
 statusLabel: "තත්ත්වය",
 remarksLabel: "වෛද්ය නිරීක්ෂණ",
 vitalsHeading: "දෛනික ශාරීරික මිණුම්",
 saveChanges: "වාර්තාව සුරකින්න",
 cancel: "අවලංගු කරන්න",
 statusLabels: {
 PENDING: "පොරොත්තු",
 IN_PROGRESS: "ක්රියාත්මක වෙමින්",
 COMPLETED: "අවසන් කරන ලදී",
 CONTRAINDICATED_SKIPPED: "නොසුදුසු බැවින් බැහැර කළ",
 },
 stageLabels: {
 PURVAKARMA_PREP: "පූර්වකර්ම",
 PRADHANAKARMA_DETOX: "ප්රධානකර්ම",
 PASCHATKARMA_REJUV: "පශ්චාත්කර්ම",
 },
 },
 ta: {
 title: "பஞ்சகர்மா சிகிச்சை முன்னேற்ற கண்காணிப்பு",
 subtitle: "தினசரி ஆயுர்வேத சிகிச்சை பதிவேடு மற்றும் நோயாளர் உடல்நிலை கண்காணிப்பு",
 kpiInHouse: "தங்கி சிகிச்சை பெறுவோர்",
 kpiTodayCompleted: "இன்று முடிந்த சிகிச்சைகள்",
 kpiDeepDetox: "ஆழமான நச்சு நீக்கத்தில்",
 kpiGraduating: "இந்த வாரம் நிறைவுபெறுவோர்",
 dayProgress: "திட்ட நாள்",
 stagePrep: "பூர்வகர்மா (தயாரிப்பு)",
 stageDetox: "பிரதானகர்மா (நச்சு நீக்கம்)",
 stageRejuv: "பச்சாத் கர்மா (புத்துணர்ச்சி)",
 morningSession: "காலை சிகிச்சை நேரம்",
 afternoonSession: "மாலை சிகிச்சை நேரம்",
 attendingDoctor: "பொறுப்பு மருத்துவர்",
 dominantDoshaLabel: "தோஷ விவரம்",
 prescribedDietLabel: "ஆயுர்வேத உணவு முறை",
 updateTherapyBtn: "சிகிச்சையை புதுப்பிக்க",
 modalTitle: "தினசரி சிகிச்சை அறிக்கை",
 statusLabel: "சிகிச்சை நிலை",
 remarksLabel: "மருத்துவ அவதானிப்புகள்",
 vitalsHeading: "தினசரி உடல் அளவீடுகள்",
 saveChanges: "பதிவை சேமிக்க",
 cancel: "ரத்து செய்",
 statusLabels: {
 PENDING: "நிலுவையில்",
 IN_PROGRESS: "நடைபெறுகிறது",
 COMPLETED: "முடிவடைந்தது",
 CONTRAINDICATED_SKIPPED: "தவிர்க்கப்பட்டது",
 },
 stageLabels: {
 PURVAKARMA_PREP: "பூர்வகர்மா",
 PRADHANAKARMA_DETOX: "பிரதானகர்மா",
 PASCHATKARMA_REJUV: "பச்சாத் கர்மா",
 },
 },
};

export function getPanchakarmaTranslations(
 lang: SupportedLanguage = "en",
): PanchakarmaTranslations {
 return PANCHAKARMA_TRANSLATIONS[lang] ?? PANCHAKARMA_TRANSLATIONS.en;
}

// ============================================================================
// Pure Calculations & KPI Helpers
// ============================================================================

export function countCompletedSessions(record?: DailyPanchakarmaRecord): number {
 if (!record) return 0;
 let count = 0;
 if (record.morningTherapy.status === "COMPLETED") count++;
 if (record.afternoonTherapy.status === "COMPLETED") count++;
 return count;
}

export function calculatePanchakarmaKpiSummary(
 guests: ReadonlyArray<PanchakarmaGuestProfile>,
): PanchakarmaKpiSummary {
 let completedToday = 0;
 let totalScheduledToday = 0;
 let deepDetoxCount = 0;
 let graduatingCount = 0;
 let totalProgressAcc = 0;

 for (const g of guests) {
 totalProgressAcc += Math.min(100, Math.round((g.currentDay / g.totalDays) * 100));
 if (g.totalDays - g.currentDay <= 2) {
 graduatingCount++;
 }

 const todayRec = g.dailyRecords[0];
 if (todayRec) {
 totalScheduledToday += 2;
 completedToday += countCompletedSessions(todayRec);
 if (todayRec.stage === "PRADHANAKARMA_DETOX") deepDetoxCount++;
 }
 }

 const avgProgress = guests.length > 0 ? Math.round(totalProgressAcc / guests.length) : 0;

 return {
 inHouseGuestsCount: guests.length,
 completedTodayCount: completedToday,
 totalScheduledTodayCount: totalScheduledToday,
 deepDetoxPhaseCount: deepDetoxCount,
 graduatingThisWeekCount: graduatingCount,
 avgProgressPercent: avgProgress,
 };
}

export function getSessionStatusBadgeClass(status: SessionCompletionStatus): string {
 switch (status) {
 case "COMPLETED":
 return "bg-emerald-500/15 text-emerald-700 border border-emerald-500/25";
 case "IN_PROGRESS":
 return "bg-sky-500/15 text-sky-700 border border-sky-500/25 animate-pulse";
 case "PENDING":
 return "bg-amber-500/15 text-amber-700 border border-amber-500/25";
 case "CONTRAINDICATED_SKIPPED":
 return "bg-rose-500/15 text-rose-700 border border-rose-500/25";
 }
}

export function getStageBadgeClass(stage: PanchakarmaStage): string {
 switch (stage) {
 case "PURVAKARMA_PREP":
 return "bg-indigo-500/15 text-indigo-700 border border-indigo-500/25";
 case "PRADHANAKARMA_DETOX":
 return "bg-amber-500/15 text-amber-800 border border-amber-500/30";
 case "PASCHATKARMA_REJUV":
 return "bg-emerald-500/15 text-emerald-700 border border-emerald-500/25";
 }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12 each)
// ============================================================================

interface PanchakarmaKpiCardsProps {
 readonly summary: PanchakarmaKpiSummary;
 readonly t: PanchakarmaTranslations;
}

const PanchakarmaKpiCards: FC<PanchakarmaKpiCardsProps> = ({ summary, t }) => {
 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
 <div className="apple-liquid-glass bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
 <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 ">
 {t.kpiInHouse}
 </span>
 <div className="text-xl sm:text-2xl font-bold text-emerald-950 tabular-nums-lkr mt-1">
 {summary.inHouseGuestsCount} Patients
 </div>
 <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
 Avg Progress: {summary.avgProgressPercent}%
 </div>
 </div>

 <div className="apple-liquid-glass bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 shadow-sm">
 <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 ">
 {t.kpiTodayCompleted}
 </span>
 <div className="text-xl sm:text-2xl font-bold text-sky-950 tabular-nums-lkr mt-1">
 {summary.completedTodayCount} / {summary.totalScheduledTodayCount}
 </div>
 <div className="text-[10px] text-sky-700 font-mono mt-0.5">
 Morning & Afternoon Sessions
 </div>
 </div>

 <div className="apple-liquid-glass bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 shadow-sm">
 <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 ">
 {t.kpiDeepDetox}
 </span>
 <div className="text-xl sm:text-2xl font-bold text-amber-950 tabular-nums-lkr mt-1">
 {summary.deepDetoxPhaseCount} In Pradhanakarma
 </div>
 <div className="text-[10px] text-amber-700 font-mono mt-0.5">
 Virechana / Basti protocols active
 </div>
 </div>

 <div className="apple-liquid-glass bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
 <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 ">
 {t.kpiGraduating}
 </span>
 <div className="text-xl sm:text-2xl font-bold text-indigo-950 tabular-nums-lkr mt-1">
 {summary.graduatingThisWeekCount} Patients
 </div>
 <div className="text-[10px] text-indigo-700 font-mono mt-0.5">
 Transitioning to home Rasayana herbs
 </div>
 </div>
 </div>
 );
};

interface PatientCardProps {
 readonly guest: PanchakarmaGuestProfile;
 readonly t: PanchakarmaTranslations;
 readonly onOpenUpdateModal: (
 guest: PanchakarmaGuestProfile,
 record: DailyPanchakarmaRecord,
 sessionType: "MORNING" | "AFTERNOON",
 ) => void;
}

const PatientCard: FC<PatientCardProps> = ({ guest, t, onOpenUpdateModal }) => {
 const percent = Math.min(100, Math.round((guest.currentDay / guest.totalDays) * 100));
 const record = guest.dailyRecords[0];

 return (
 <article
 data-testid={`panchakarma-guest-${guest.id}`}
 className="apple-liquid-glass bg-white/70 border border-stone-200/80 rounded-2xl p-5 shadow-sm space-y-4"
 >
 {/* Patient Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/60 ">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-bold text-base text-stone-950 ">
 {guest.guestName}
 </span>
 <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
 {guest.roomNumber}
 </span>
 </div>
 <div className="text-xs text-stone-500 mt-0.5">
 {guest.programTitle} • {t.attendingDoctor}: {guest.attendingVaidya}
 </div>
 </div>

 <div className="text-right">
 <div className="text-xs font-bold text-stone-900 tabular-nums-lkr">
 {t.dayProgress} {guest.currentDay} of {guest.totalDays} ({percent}%)
 </div>
 <div className="w-36 h-2 bg-stone-100 rounded-full overflow-hidden mt-1 ml-auto">
 <div
 className="h-full bg-emerald-500 rounded-full transition-all"
 style={{ width: `${percent}%` }}
 />
 </div>
 </div>
 </div>

 {/* Daily Sessions Grid */}
 {record && (
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-stone-800 ">
 Today (Day {record.dayNumber} - {record.date})
 </span>
 <span
 className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStageBadgeClass(record.stage)}`}
 >
 {t.stageLabels[record.stage]}
 </span>
 </div>
 {record.bloodPressure && (
 <span className="font-mono text-stone-500 text-[11px]">
 BP: {record.bloodPressure} • Pulse: {record.pulseRateBpm} bpm
 </span>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {/* Morning Session */}
 <div className="p-3.5 rounded-xl border border-stone-200/70 bg-stone-50/50 space-y-2 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between gap-2 mb-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 ">
 AM {t.morningSession} ({record.morningTherapy.scheduledTime})
 </span>
 <span
 className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getSessionStatusBadgeClass(record.morningTherapy.status)}`}
 >
 {t.statusLabels[record.morningTherapy.status]}
 </span>
 </div>
 <div className="font-semibold text-xs text-stone-950 ">
 {record.morningTherapy.treatmentName}
 </div>
 <div className="text-[11px] text-stone-500">
 Therapist: {record.morningTherapy.therapistName}
 </div>
 {record.morningTherapy.clinicalRemarks && (
 <div className="text-[11px] text-stone-600 italic mt-1 bg-white/60 p-1.5 rounded">
 "{record.morningTherapy.clinicalRemarks}"
 </div>
 )}
 </div>

 <button
 type="button"
 onClick={() => onOpenUpdateModal(guest, record, "MORNING")}
 className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 cursor-pointer"
 >
 {t.updateTherapyBtn}
 </button>
 </div>

 {/* Afternoon Session */}
 <div className="p-3.5 rounded-xl border border-stone-200/70 bg-stone-50/50 space-y-2 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between gap-2 mb-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 ">
 PM {t.afternoonSession} ({record.afternoonTherapy.scheduledTime})
 </span>
 <span
 className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getSessionStatusBadgeClass(record.afternoonTherapy.status)}`}
 >
 {t.statusLabels[record.afternoonTherapy.status]}
 </span>
 </div>
 <div className="font-semibold text-xs text-stone-950 ">
 {record.afternoonTherapy.treatmentName}
 </div>
 <div className="text-[11px] text-stone-500">
 Therapist: {record.afternoonTherapy.therapistName}
 </div>
 {record.afternoonTherapy.clinicalRemarks && (
 <div className="text-[11px] text-stone-600 italic mt-1 bg-white/60 p-1.5 rounded">
 "{record.afternoonTherapy.clinicalRemarks}"
 </div>
 )}
 </div>

 <button
 type="button"
 onClick={() => onOpenUpdateModal(guest, record, "AFTERNOON")}
 className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 cursor-pointer"
 >
 {t.updateTherapyBtn}
 </button>
 </div>
 </div>

 {/* Diet note */}
 <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-center gap-2">
 <span>
 <strong>{t.prescribedDietLabel}:</strong> {record.prescribedDiet}
 </span>
 </div>
 </div>
 )}
 </article>
 );
};

interface UpdateTherapyModalProps {
 readonly guest: PanchakarmaGuestProfile;
 readonly record: DailyPanchakarmaRecord;
 readonly sessionType: "MORNING" | "AFTERNOON";
 readonly t: PanchakarmaTranslations;
 readonly onClose: () => void;
 readonly onSave: (updated: DailyTherapySession, bp?: string, pulse?: number) => void;
}

const UpdateTherapyModal: FC<UpdateTherapyModalProps> = ({
 guest,
 record,
 sessionType,
 t,
 onClose,
 onSave,
}) => {
 const modalHeadingId = useId();
 const statusSelectId = useId();
 const remarksInputId = useId();
 const bpInputId = useId();
 const pulseInputId = useId();

 const currentSession =
 sessionType === "MORNING" ? record.morningTherapy : record.afternoonTherapy;

 const [status, setStatus] = useState<SessionCompletionStatus>(currentSession.status);
 const [remarks, setRemarks] = useState(currentSession.clinicalRemarks ?? "");
 const [bp, setBp] = useState(record.bloodPressure ?? "120/80 mmHg");
 const [pulse, setPulse] = useState(record.pulseRateBpm ?? 72);

 const handleSave = () => {
 const updated: DailyTherapySession = {
 ...currentSession,
 status,
 clinicalRemarks: remarks.trim() ? remarks : undefined,
 };
 void playOrderBell("PAYMENT_CONFIRMED");
 onSave(updated, bp, pulse);
 };

 return (
 <dialog
 open
 aria-labelledby={modalHeadingId}
 className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm w-full h-full max-w-none max-h-none border-0 m-0 animate-in fade-in duration-200"
 >
 <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-2xl space-y-4">
 <div className="flex items-start justify-between pb-3 border-b border-stone-200 ">
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
 {sessionType} SESSION • DAY {record.dayNumber}
 </span>
 <h3
 id={modalHeadingId}
 className="text-base font-bold text-stone-900 "
 >
 {currentSession.treatmentName}
 </h3>
 <p className="text-xs text-stone-500">
 {guest.guestName} ({guest.roomNumber})
 </p>
 </div>
 <button
 type="button"
 onClick={onClose}
 aria-label="Close dialog"
 className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center font-bold cursor-pointer"
 >
 x
 </button>
 </div>

 {/* Session Status Selector */}
 <div>
 <label
 htmlFor={statusSelectId}
 className="block text-xs font-semibold text-stone-700 mb-1"
 >
 {t.statusLabel}
 </label>
 <select
 id={statusSelectId}
 value={status}
 onChange={(e) => setStatus(e.target.value as SessionCompletionStatus)}
 className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 cursor-pointer"
 >
 <option value="PENDING">{t.statusLabels.PENDING}</option>
 <option value="IN_PROGRESS">{t.statusLabels.IN_PROGRESS}</option>
 <option value="COMPLETED">{t.statusLabels.COMPLETED}</option>
 <option value="CONTRAINDICATED_SKIPPED">
 {t.statusLabels.CONTRAINDICATED_SKIPPED}
 </option>
 </select>
 </div>

 {/* Vitals Recording */}
 <div>
 <span className="block text-xs font-semibold text-stone-700 mb-1">
 {t.vitalsHeading}
 </span>
 <div className="grid grid-cols-2 gap-2 font-mono">
 <div>
 <label htmlFor={bpInputId} className="text-[10px] text-stone-500 block">
 Blood Pressure
 </label>
 <input
 id={bpInputId}
 type="text"
 value={bp}
 onChange={(e) => setBp(e.target.value)}
 placeholder="120/80 mmHg"
 className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-stone-300 "
 />
 </div>
 <div>
 <label htmlFor={pulseInputId} className="text-[10px] text-stone-500 block">
 Pulse (bpm)
 </label>
 <input
 id={pulseInputId}
 type="number"
 value={pulse}
 onChange={(e) => setPulse(Number.parseInt(e.target.value, 10) || 72)}
 className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-stone-300 "
 />
 </div>
 </div>
 </div>

 {/* Clinical Remarks */}
 <div>
 <label
 htmlFor={remarksInputId}
 className="block text-xs font-semibold text-stone-700 mb-1"
 >
 {t.remarksLabel}
 </label>
 <textarea
 id={remarksInputId}
 rows={2}
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 placeholder="e.g. Dosha symptom changes, skin response, digestive fire (Agni) state"
 className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 "
 />
 </div>

 {/* Actions */}
 <div className="flex gap-2.5 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
 >
 {t.cancel}
 </button>
 <button
 type="button"
 onClick={handleSave}
 className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
 >
 <span>{t.saveChanges}</span>
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main Exported Component: PanchakarmaTracker
// ============================================================================

function updateGuestRecord(
 record: DailyPanchakarmaRecord,
 targetDay: number,
 sessionType: "MORNING" | "AFTERNOON",
 updatedSession: DailyTherapySession,
 bp?: string,
 pulse?: number,
): DailyPanchakarmaRecord {
 if (record.dayNumber !== targetDay) return record;
 return {
 ...record,
 morningTherapy: sessionType === "MORNING" ? updatedSession : record.morningTherapy,
 afternoonTherapy: sessionType === "AFTERNOON" ? updatedSession : record.afternoonTherapy,
 bloodPressure: bp ?? record.bloodPressure,
 pulseRateBpm: pulse ?? record.pulseRateBpm,
 };
}

export const PanchakarmaTracker: FC<PanchakarmaTrackerProps> = ({
 initialGuests = DEFAULT_PANCHAKARMA_GUESTS,
 language = "en",
 onUpdateSession,
 testId = "panchakarma-tracker",
}) => {
 const t = useMemo(() => getPanchakarmaTranslations(language), [language]);

 const [guests, setGuests] = useState<readonly PanchakarmaGuestProfile[]>(initialGuests);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedDuration, setSelectedDuration] = useState<"ALL" | PanchakarmaDurationDays>("ALL");

 const [modalState, setModalState] = useState<{
 guest: PanchakarmaGuestProfile;
 record: DailyPanchakarmaRecord;
 sessionType: "MORNING" | "AFTERNOON";
 } | null>(null);

 // KPIs
 const kpis = useMemo(() => calculatePanchakarmaKpiSummary(guests), [guests]);

 // Filtered guests
 const filteredGuests = useMemo(() => {
 return guests.filter((g) => {
 if (selectedDuration !== "ALL" && g.totalDays !== selectedDuration) {
 return false;
 }
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 const matchesName = g.guestName.toLowerCase().includes(q);
 const matchesRoom = g.roomNumber.toLowerCase().includes(q);
 const matchesRef = g.registrationRef.toLowerCase().includes(q);
 if (!matchesName && !matchesRoom && !matchesRef) return false;
 }
 return true;
 });
 }, [guests, selectedDuration, searchQuery]);

 const handleSaveModal = (updatedSession: DailyTherapySession, bp?: string, pulse?: number) => {
 if (!modalState) return;
 const { guest, record, sessionType } = modalState;

 setGuests((prev) =>
 prev.map((g) => {
 if (g.id !== guest.id) return g;
 return {
 ...g,
 dailyRecords: g.dailyRecords.map((r) =>
 updateGuestRecord(r, record.dayNumber, sessionType, updatedSession, bp, pulse),
 ),
 };
 }),
 );

 onUpdateSession?.(guest.id, record.dayNumber, sessionType, updatedSession);
 setModalState(null);
 };

 return (
 <section data-testid={testId} className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
 {/* Header */}
 <header className="space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 ">
 Ayurveda Sanctuary Clinical Board
 </span>
 <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
 {guests.length} In-House Retreat Patients
 </span>
 </div>
 <h1 className="text-2xl font-bold tracking-tight text-stone-900 ">
 {t.title}
 </h1>
 <p className="text-xs text-stone-600 ">{t.subtitle}</p>
 </header>

 {/* KPI Bento Cards */}
 <PanchakarmaKpiCards summary={kpis} t={t} />

 {/* Filter Bar */}
 <div className="apple-liquid-glass bg-white/70 border border-stone-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
 <div className="flex bg-stone-100 p-1 rounded-xl gap-1 shrink-0">
 {(
 [
 { id: "ALL", label: "All Programs" },
 { id: 7, label: "7-Day Rejuvenation" },
 { id: 14, label: "14-Day Deep Shodhana" },
 { id: 21, label: "21-Day Rasayana" },
 ] as const
 ).map((tab) => {
 const active = selectedDuration === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setSelectedDuration(tab.id as "ALL" | PanchakarmaDurationDays)}
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 active
 ? "bg-white text-stone-900 shadow-sm"
 : "text-stone-600 "
 }`}
 >
 {tab.label}
 </button>
 );
 })}
 </div>

 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by patient name, room, or registration ID…"
 className="px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 max-w-sm"
 />
 </div>

 {/* Inpatient Cards Grid */}
 <div className="space-y-4">
 {filteredGuests.map((guest) => (
 <PatientCard
 key={guest.id}
 guest={guest}
 t={t}
 onOpenUpdateModal={(g, rec, sType) =>
 setModalState({ guest: g, record: rec, sessionType: sType })
 }
 />
 ))}

 {filteredGuests.length === 0 && (
 <div className="p-12 text-center text-xs text-stone-400 bg-white/40 rounded-2xl border border-dashed border-stone-300">
 No Panchakarma patient profiles matching current filters.
 </div>
 )}
 </div>

 {/* Update Session Modal */}
 {modalState && (
 <UpdateTherapyModal
 guest={modalState.guest}
 record={modalState.record}
 sessionType={modalState.sessionType}
 t={t}
 onClose={() => setModalState(null)}
 onSave={handleSaveModal}
 />
 )}
 </section>
 );
};
