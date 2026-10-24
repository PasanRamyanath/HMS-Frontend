/**
 * Banquet Hall & Outdoor Lawn Master Configurator (BanquetHallSetup.tsx)
 *
 * Implements Step 328 (Phase 14.03) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive banquet hall, wedding ballroom, and outdoor event lawn configurator:
 *
 * 1. Venue configurations (Grand Ballroom, Kandyan Wing, Garden Lawn, Rooftop Terrace)
 * 2. Multi-layout seating capacities (Round Table Cluster, Theatre, Classroom, Cocktail Standing)
 * 3. AC package hours included (e.g., 7 hours standard: 5h event + 2h Poruwa ceremony/setup)
 * 4. Overtime hourly electricity & AC rates in .tabular-nums-lkr
 * 5. Sri Lankan Wedding amenities (Poruwa stage, Bridal changing suite, 3-Phase generator, Pantry)
 * 6. Trilingual localization support (English, Sinhala, Tamil)
 * 7. Apple Human Interface Guidelines: .apple-liquid-glass, continuous squircles, >=44x44pt touch targets
 * 8. Zero console noise, cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HallType =
 | "INDOOR_AIR_CONDITIONED"
 | "OUTDOOR_GARDEN_LAWN"
 | "BEACHFRONT_PAVILION"
 | "ROOFTOP_TERRACE";

export type HallFilterOption = "ALL" | HallType;

export interface HallCapacityConfig {
 readonly roundTableClusterPax: number;
 readonly theatrePax: number;
 readonly classroomPax: number;
 readonly uShapePax: number;
 readonly cocktailStandingPax: number;
}

export interface BanquetHallRecord {
 readonly id: string;
 readonly tenantId: string;
 readonly name: string;
 readonly hallType: HallType;
 readonly floorAreaSqFt: number;
 readonly capacities: HallCapacityConfig;
 readonly includedAcHours: number;
 readonly overtimeHourlyRateLkr: number;
 readonly baseRentalLkr: number;
 readonly hasPoruwaStage: boolean;
 readonly hasBridalChangingRoom: boolean;
 readonly hasDedicatedKitchenPantry: boolean;
 readonly hasBackupGeneratorPower: boolean;
 readonly isActive: boolean;
 readonly notes?: string | undefined;
 readonly updatedAtIso: string;
}

export interface BanquetHallSummary {
 readonly totalHalls: number;
 readonly activeHalls: number;
 readonly totalMaxClusterPax: number;
 readonly totalMaxTheatrePax: number;
 readonly indoorAcCount: number;
 readonly outdoorLawnCount: number;
}

export interface BanquetHallSetupProps {
 readonly tenantId?: string | undefined;
 readonly propertyName?: string | undefined;
 readonly initialHalls?: readonly BanquetHallRecord[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onSaveHall?: ((hall: BanquetHallRecord) => Promise<void> | void) | undefined;
 readonly onDeleteHall?: ((hallId: string) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_BANQUET_HALLS: readonly BanquetHallRecord[] = [
 {
 id: "hall-grand-ballroom",
 tenantId: "galle-face-heritage",
 name: "Grand Ballroom",
 hallType: "INDOOR_AIR_CONDITIONED",
 floorAreaSqFt: 8500,
 capacities: {
 roundTableClusterPax: 450,
 theatrePax: 800,
 classroomPax: 350,
 uShapePax: 120,
 cocktailStandingPax: 1000,
 },
 includedAcHours: 7,
 overtimeHourlyRateLkr: 35000,
 baseRentalLkr: 250000,
 hasPoruwaStage: true,
 hasBridalChangingRoom: true,
 hasDedicatedKitchenPantry: true,
 hasBackupGeneratorPower: true,
 isActive: true,
 notes: "Crystal chandeliers, acoustic soundproofing, and separate VIP entrance.",
 updatedAtIso: "2026-10-20T10:00:00Z",
 },
 {
 id: "hall-kandyan-wing",
 tenantId: "galle-face-heritage",
 name: "Kandyan Heritage Wing",
 hallType: "INDOOR_AIR_CONDITIONED",
 floorAreaSqFt: 4200,
 capacities: {
 roundTableClusterPax: 200,
 theatrePax: 350,
 classroomPax: 150,
 uShapePax: 60,
 cocktailStandingPax: 400,
 },
 includedAcHours: 7,
 overtimeHourlyRateLkr: 25000,
 baseRentalLkr: 150000,
 hasPoruwaStage: true,
 hasBridalChangingRoom: true,
 hasDedicatedKitchenPantry: true,
 hasBackupGeneratorPower: true,
 isActive: true,
 notes: "Traditional carved timber pillars, ideal for cultural weddings & Poruwa ceremonies.",
 updatedAtIso: "2026-10-20T10:00:00Z",
 },
 {
 id: "hall-garden-lawn",
 tenantId: "galle-face-heritage",
 name: "Palm Garden & Coconut Grove",
 hallType: "OUTDOOR_GARDEN_LAWN",
 floorAreaSqFt: 15000,
 capacities: {
 roundTableClusterPax: 600,
 theatrePax: 1000,
 classroomPax: 0,
 uShapePax: 0,
 cocktailStandingPax: 1200,
 },
 includedAcHours: 6,
 overtimeHourlyRateLkr: 20000,
 baseRentalLkr: 180000,
 hasPoruwaStage: true,
 hasBridalChangingRoom: false,
 hasDedicatedKitchenPantry: true,
 hasBackupGeneratorPower: true,
 isActive: true,
 notes: "Outdoor manicured lawns facing the Indian Ocean with marquee canopy hooks.",
 updatedAtIso: "2026-10-20T10:00:00Z",
 },
 {
 id: "hall-rooftop-terrace",
 tenantId: "galle-face-heritage",
 name: "Sunset Ocean Rooftop",
 hallType: "ROOFTOP_TERRACE",
 floorAreaSqFt: 3500,
 capacities: {
 roundTableClusterPax: 120,
 theatrePax: 200,
 classroomPax: 80,
 uShapePax: 40,
 cocktailStandingPax: 250,
 },
 includedAcHours: 6,
 overtimeHourlyRateLkr: 18000,
 baseRentalLkr: 120000,
 hasPoruwaStage: false,
 hasBridalChangingRoom: true,
 hasDedicatedKitchenPantry: false,
 hasBackupGeneratorPower: true,
 isActive: true,
 notes: "Panoramic sea view, preferred for intimate cocktail parties and homecoming dinners.",
 updatedAtIso: "2026-10-20T10:00:00Z",
 },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface HallTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly filterAll: string;
 readonly filterIndoor: string;
 readonly filterLawn: string;
 readonly filterBeach: string;
 readonly filterRooftop: string;
 readonly searchPlaceholder: string;
 readonly addHallBtn: string;
 readonly editBtn: string;
 readonly deleteBtn: string;
 readonly saveBtn: string;
 readonly cancelBtn: string;
 readonly totalVenues: string;
 readonly activeVenues: string;
 readonly maxClusterPax: string;
 readonly maxTheatrePax: string;
 readonly clusterLayout: string;
 readonly theatreLayout: string;
 readonly classroomLayout: string;
 readonly cocktailLayout: string;
 readonly acHoursIncluded: string;
 readonly overtimeRate: string;
 readonly baseRental: string;
 readonly poruwaStage: string;
 readonly bridalSuite: string;
 readonly generatorBackup: string;
 readonly kitchenPantry: string;
 readonly hallNameLabel: string;
 readonly hallTypeLabel: string;
 readonly sqftLabel: string;
 readonly statusActive: string;
 readonly statusInactive: string;
}

const TRANSLATIONS: Record<SupportedLanguage, HallTranslations> = {
 en: {
 title: "Banquet & Wedding Hall Master Setup",
 subtitle: "Configure ballrooms, outdoor lawns, seating capacities, and AC overtime rates",
 filterAll: "All Venues",
 filterIndoor: "Indoor AC Ballrooms",
 filterLawn: "Outdoor Lawns",
 filterBeach: "Beach Pavilions",
 filterRooftop: "Rooftop Terraces",
 searchPlaceholder: "Search venue by name, capacity, or setup...",
 addHallBtn: "Add Venue",
 editBtn: "Edit Configuration",
 deleteBtn: "Delete",
 saveBtn: "Save Venue",
 cancelBtn: "Cancel",
 totalVenues: "Total Venues",
 activeVenues: "Active Venues",
 maxClusterPax: "Max Cluster Pax",
 maxTheatrePax: "Max Theatre Pax",
 clusterLayout: "Cluster (Round Table)",
 theatreLayout: "Theatre",
 classroomLayout: "Classroom",
 cocktailLayout: "Cocktail Standing",
 acHoursIncluded: "Included AC Hours",
 overtimeRate: "Overtime Rate / Hour",
 baseRental: "Base Hall Rental",
 poruwaStage: "Poruwa Stage Setup",
 bridalSuite: "Bridal Suite",
 generatorBackup: "Generator Power",
 kitchenPantry: "Kitchen Pantry",
 hallNameLabel: "Hall / Lawn Name",
 hallTypeLabel: "Venue Type",
 sqftLabel: "Floor Area (Sq Ft)",
 statusActive: "Active for Booking",
 statusInactive: "Under Maintenance",
 },
 si: {
 title: "උත්සව ශාලා හා එළිමහන් භූමි කළමනාකරණය",
 subtitle: "මංගල ශාලා, ආසන ධාරිතාව හා වායු සමීකරණ අතිකාල ගාස්තු සකසන්න",
 filterAll: "සියලු ශාලා",
 filterIndoor: "වායුසමනය කළ ශාලා",
 filterLawn: "එළිමහන් භූමි",
 filterBeach: "වෙරළ මණ්ඩප",
 filterRooftop: "වහල මත පිහිටි ශාලා",
 searchPlaceholder: "ශාලා නම හෝ ධාරිතාව සොයන්න...",
 addHallBtn: "නව ශාලාවක් එක් කරන්න",
 editBtn: "සංස්කරණය",
 deleteBtn: "ඉවත් කරන්න",
 saveBtn: "සුරකින්න",
 cancelBtn: "අවලංගු කරන්න",
 totalVenues: "මුළු ශාලා ගණන",
 activeVenues: "සක්රීය ශාලා",
 maxClusterPax: "උපරිම මේස ආසන",
 maxTheatrePax: "නාට්ය ආසන ධාරිතාව",
 clusterLayout: "වට මේස සැකසුම",
 theatreLayout: "ප්රේක්ෂකාගාර සැකසුම",
 classroomLayout: "පන්ති කාමර සැකසුම",
 cocktailLayout: "කොක්ටේල් සාද සැකසුම",
 acHoursIncluded: "ඇතුළත් වායු සමීකරණ පැය",
 overtimeRate: "පැයක අතිකාල ගාස්තුව",
 baseRental: "මූලික ශාලා කුලිය",
 poruwaStage: "පෝරු මණ්ඩප පහසුකම්",
 bridalSuite: "මනමාලියන්ගේ කාමරය",
 generatorBackup: "ජනක යන්ත්ර විදුලිය",
 kitchenPantry: "සේවා පැන්ට්රිය",
 hallNameLabel: "ශාලාවේ නම",
 hallTypeLabel: "ශාලා වර්ගය",
 sqftLabel: "වර්ග අඩි ප්රමාණය",
 statusActive: "වෙන්කිරීම් සඳහා සක්රීයයි",
 statusInactive: "නඩත්තු කටයුතු සඳහා වසා ඇත",
 },
 ta: {
 title: "மண்டபம் & வெளிப்புற புல்வெளி முதன்மை அமைப்பு",
 subtitle: "திருமண மண்டபங்கள், இருக்கை வசதிகள் மற்றும் ஏசி கூடுதல் நேரக் கட்டணங்கள்",
 filterAll: "அனைத்து மண்டபங்கள்",
 filterIndoor: "ஏசி மண்டபங்கள்",
 filterLawn: "வெளிப்புற புல்வெளிகள்",
 filterBeach: "கடற்கரை கூடாரங்கள்",
 filterRooftop: "கூரை மாடி மண்டபங்கள்",
 searchPlaceholder: "மண்டபப் பெயர் அல்லது கொள்ளளவை தேடுங்கள்...",
 addHallBtn: "மண்டபம் சேர்க்க",
 editBtn: "திருத்துக",
 deleteBtn: "நீக்குக",
 saveBtn: "சேமிக்க",
 cancelBtn: "ரத்து செய்",
 totalVenues: "மொத்த மண்டபங்கள்",
 activeVenues: "செயலில் உள்ளவை",
 maxClusterPax: "அதிகபட்ச வட்ட மேஜை ஆட்கள்",
 maxTheatrePax: "அதிகபட்ச அரங்கு ஆட்கள்",
 clusterLayout: "வட்ட மேஜை அமைப்பு",
 theatreLayout: "அரங்கு அமைப்பு",
 classroomLayout: "வகுப்பறை அமைப்பு",
 cocktailLayout: "காக்டெய்ல் அமைப்பு",
 acHoursIncluded: "உள்ளடக்கப்பட்ட ஏசி மணிநேரம்",
 overtimeRate: "கூடுதல் நேரக் கட்டணம் / மணி",
 baseRental: "அடிப்படை வாடகை",
 poruwaStage: "பொறுவை மேடை வசதி",
 bridalSuite: "மணமகள் அறை",
 generatorBackup: "மின்பிறப்பாக்கி வசதி",
 kitchenPantry: "சமையலறை பேண்ட்ரி",
 hallNameLabel: "மண்டபப் பெயர்",
 hallTypeLabel: "மண்டப வகை",
 sqftLabel: "பரப்பளவு (சதுர அடி)",
 statusActive: "முன்பதிவுக்கு திறக்கப்பட்டுள்ளது",
 statusInactive: "பராமரிப்பில் உள்ளது",
 },
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function filterHalls(
 halls: readonly BanquetHallRecord[],
 selectedFilter: HallFilterOption,
 searchTerm: string,
): readonly BanquetHallRecord[] {
 const query = searchTerm.trim().toLowerCase();
 return halls.filter((hall) => {
 if (selectedFilter !== "ALL" && hall.hallType !== selectedFilter) {
 return false;
 }
 if (query === "") return true;
 return (
 hall.name.toLowerCase().includes(query) ||
 hall.notes?.toLowerCase().includes(query) ||
 hall.capacities.roundTableClusterPax.toString().includes(query) ||
 hall.capacities.theatrePax.toString().includes(query)
 );
 });
}

export function calculateHallSummary(halls: readonly BanquetHallRecord[]): BanquetHallSummary {
 let activeHalls = 0;
 let totalMaxClusterPax = 0;
 let totalMaxTheatrePax = 0;
 let indoorAcCount = 0;
 let outdoorLawnCount = 0;

 for (const h of halls) {
 if (h.isActive) activeHalls += 1;
 totalMaxClusterPax += h.capacities.roundTableClusterPax;
 totalMaxTheatrePax += h.capacities.theatrePax;
 if (h.hallType === "INDOOR_AIR_CONDITIONED") indoorAcCount += 1;
 if (h.hallType === "OUTDOOR_GARDEN_LAWN" || h.hallType === "BEACHFRONT_PAVILION") {
 outdoorLawnCount += 1;
 }
 }

 return {
 totalHalls: halls.length,
 activeHalls,
 totalMaxClusterPax,
 totalMaxTheatrePax,
 indoorAcCount,
 outdoorLawnCount,
 };
}

export function formatLkr(amount: number): string {
 return amount.toLocaleString("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 });
}

// ============================================================================
// Subcomponents
// ============================================================================

interface HallSummaryCardsProps {
 readonly summary: BanquetHallSummary;
 readonly t: HallTranslations;
}

const HallSummaryCards: FC<HallSummaryCardsProps> = ({ summary, t }) => {
 return (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#E2E8F0] shadow-sm">
 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
 {t.totalVenues}
 </p>
 <div className="mt-1 flex items-baseline gap-2">
 <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 ">
 {summary.totalHalls}
 </span>
 <span className="text-xs text-emerald-600 font-medium">
 ({summary.activeHalls} {t.activeVenues.toLowerCase()})
 </span>
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#E2E8F0] shadow-sm">
 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
 {t.maxClusterPax}
 </p>
 <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-indigo-600 ">
 {summary.totalMaxClusterPax.toLocaleString()}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#E2E8F0] shadow-sm">
 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
 {t.maxTheatrePax}
 </p>
 <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-sky-600 ">
 {summary.totalMaxTheatrePax.toLocaleString()}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#E2E8F0] shadow-sm">
 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
 {t.filterIndoor}
 </p>
 <div className="mt-1 flex items-baseline gap-2">
 <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 ">
 {summary.indoorAcCount}
 </span>
 <span className="text-xs text-slate-500 ">
 / {summary.outdoorLawnCount} Lawns
 </span>
 </div>
 </div>
 </div>
 );
};

interface HallCardProps {
 readonly hall: BanquetHallRecord;
 readonly t: HallTranslations;
 readonly onEdit: (hall: BanquetHallRecord) => void;
 readonly onToggleActive: (hallId: string) => void;
 readonly onDelete?: ((hallId: string) => void) | undefined;
}

const HallCard: FC<HallCardProps> = ({ hall, t, onEdit, onToggleActive, onDelete }) => {
 return (
 <div
 data-testid={`banquet-hall-card-${hall.id}`}
 className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4"
 >
 <div>
 {/* Title Header & Badge */}
 <div className="flex items-start justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-lg font-bold text-slate-900 ">{hall.name}</h3>
 <span
 className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
 hall.isActive
 ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
 : "bg-slate-500/15 text-slate-600 border-slate-500/30"
 }`}
 >
 {hall.isActive ? t.statusActive : t.statusInactive}
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-0.5">
 {hall.floorAreaSqFt.toLocaleString()} sq ft • {hall.hallType.replace(/_/g, " ")}
 </p>
 </div>

 <button
 type="button"
 data-testid={`toggle-hall-active-${hall.id}`}
 onClick={() => onToggleActive(hall.id)}
 className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
 >
 {hall.isActive ? "Deactivate" : "Activate"}
 </button>
 </div>

 {hall.notes ? (
 <p className="text-xs text-slate-600 mt-2 line-clamp-2">
 {hall.notes}
 </p>
 ) : null}

 {/* Capacities Grid */}
 <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
 <div className="bg-slate-50 p-2.5 rounded-xl">
 <span className="text-slate-500 block">{t.clusterLayout}</span>
 <span className="font-bold text-sm font-mono tabular-nums text-indigo-600 ">
 {hall.capacities.roundTableClusterPax} pax
 </span>
 </div>
 <div className="bg-slate-50 p-2.5 rounded-xl">
 <span className="text-slate-500 block">{t.theatreLayout}</span>
 <span className="font-bold text-sm font-mono tabular-nums text-sky-600 ">
 {hall.capacities.theatrePax} pax
 </span>
 </div>
 <div className="bg-slate-50 p-2.5 rounded-xl">
 <span className="text-slate-500 block">{t.classroomLayout}</span>
 <span className="font-bold text-sm font-mono tabular-nums text-slate-700 ">
 {hall.capacities.classroomPax} pax
 </span>
 </div>
 <div className="bg-slate-50 p-2.5 rounded-xl">
 <span className="text-slate-500 block">{t.cocktailLayout}</span>
 <span className="font-bold text-sm font-mono tabular-nums text-amber-600 ">
 {hall.capacities.cocktailStandingPax} pax
 </span>
 </div>
 </div>

 {/* Pricing & AC Hours */}
 <div className="mt-3 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/50 flex items-center justify-between text-xs">
 <div>
 <span className="text-slate-500 block text-[11px]">
 {t.acHoursIncluded}
 </span>
 <span className="font-bold text-indigo-700 font-mono tabular-nums">
 {hall.includedAcHours} Hours
 </span>
 </div>
 <div className="text-right">
 <span className="text-slate-500 block text-[11px]">
 {t.overtimeRate}
 </span>
 <span className="font-bold text-indigo-700 font-mono tabular-nums">
 Rs. {formatLkr(hall.overtimeHourlyRateLkr)}
 </span>
 </div>
 </div>

 {/* Facilities Checklist Badges */}
 <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
 {hall.hasPoruwaStage ? (
 <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
 OK {t.poruwaStage}
 </span>
 ) : null}
 {hall.hasBridalChangingRoom ? (
 <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-700 border border-pink-500/20">
 OK {t.bridalSuite}
 </span>
 ) : null}
 {hall.hasBackupGeneratorPower ? (
 <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20">
 OK {t.generatorBackup}
 </span>
 ) : null}
 {hall.hasDedicatedKitchenPantry ? (
 <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 border border-sky-500/20">
 OK {t.kitchenPantry}
 </span>
 ) : null}
 </div>
 </div>

 {/* Action Footer */}
 <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 ">
 <button
 type="button"
 data-testid={`edit-hall-btn-${hall.id}`}
 onClick={() => onEdit(hall)}
 className="flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <span>{t.editBtn}</span>
 </button>

 {onDelete ? (
 <button
 type="button"
 data-testid={`delete-hall-btn-${hall.id}`}
 onClick={() => onDelete(hall.id)}
 className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
 >
 {t.deleteBtn}
 </button>
 ) : null}
 </div>
 </div>
 );
};

// ============================================================================
// Edit Hall Modal
// ============================================================================

interface EditHallModalProps {
 readonly isOpen: boolean;
 readonly hall: BanquetHallRecord | null;
 readonly t: HallTranslations;
 readonly onClose: () => void;
 readonly onSave: (hall: BanquetHallRecord) => void;
}

function buildUpdatedHallRecord(
 hall: BanquetHallRecord | null,
 name: string,
 floorAreaSqFt: number,
 clusterPax: number,
 theatrePax: number,
 includedAcHours: number,
 overtimeHourlyRateLkr: number,
 hasPoruwaStage: boolean,
 hasBridalChangingRoom: boolean,
): BanquetHallRecord {
 const base = hall ?? {
 id: `hall-${Date.now()}`,
 tenantId: "galle-face-heritage",
 name: "New Venue",
 hallType: "INDOOR_AIR_CONDITIONED" as const,
 floorAreaSqFt: 5000,
 capacities: {
 roundTableClusterPax: 200,
 theatrePax: 400,
 classroomPax: 150,
 uShapePax: 60,
 cocktailStandingPax: 500,
 },
 includedAcHours: 7,
 overtimeHourlyRateLkr: 25000,
 baseRentalLkr: 150000,
 hasPoruwaStage: true,
 hasBridalChangingRoom: true,
 hasDedicatedKitchenPantry: true,
 hasBackupGeneratorPower: true,
 isActive: true,
 updatedAtIso: "",
 };

 return {
 ...base,
 name: name.trim() || base.name,
 floorAreaSqFt: floorAreaSqFt > 0 ? floorAreaSqFt : base.floorAreaSqFt,
 capacities: {
 ...base.capacities,
 roundTableClusterPax: clusterPax > 0 ? clusterPax : base.capacities.roundTableClusterPax,
 theatrePax: theatrePax > 0 ? theatrePax : base.capacities.theatrePax,
 },
 includedAcHours: includedAcHours > 0 ? includedAcHours : base.includedAcHours,
 overtimeHourlyRateLkr:
 overtimeHourlyRateLkr > 0 ? overtimeHourlyRateLkr : base.overtimeHourlyRateLkr,
 hasPoruwaStage,
 hasBridalChangingRoom,
 updatedAtIso: new Date().toISOString(),
 };
}

const EditHallModal: FC<EditHallModalProps> = ({ isOpen, hall, t, onClose, onSave }) => {
 const nameId = useId();
 const sqftId = useId();
 const clusterId = useId();
 const theatreId = useId();
 const overtimeRateId = useId();
 const acHoursId = useId();

 const [name, setName] = useState(hall?.name ?? "");
 const [floorAreaSqFt, setFloorAreaSqFt] = useState(hall?.floorAreaSqFt ?? 5000);
 const [clusterPax, setClusterPax] = useState(hall?.capacities.roundTableClusterPax ?? 300);
 const [theatrePax, setTheatrePax] = useState(hall?.capacities.theatrePax ?? 500);
 const [includedAcHours, setIncludedAcHours] = useState(hall?.includedAcHours ?? 7);
 const [overtimeHourlyRateLkr, setOvertimeHourlyRateLkr] = useState(
 hall?.overtimeHourlyRateLkr ?? 30000,
 );
 const [hasPoruwaStage, setHasPoruwaStage] = useState(hall?.hasPoruwaStage ?? true);
 const [hasBridalChangingRoom, setHasBridalChangingRoom] = useState(
 hall?.hasBridalChangingRoom ?? true,
 );

 if (!isOpen) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onSave(
 buildUpdatedHallRecord(
 hall,
 name,
 floorAreaSqFt,
 clusterPax,
 theatrePax,
 includedAcHours,
 overtimeHourlyRateLkr,
 hasPoruwaStage,
 hasBridalChangingRoom,
 ),
 );
 };

 return (
 <dialog
 open
 aria-modal="true"
 data-testid="edit-hall-modal"
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md w-full h-full max-w-none max-h-none m-0 border-0"
 >
 <div className="w-full max-w-lg p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl space-y-4">
 <h2 className="text-xl font-bold text-slate-900 ">
 {hall ? t.editBtn : t.addHallBtn}
 </h2>

 <form onSubmit={handleSubmit} className="space-y-3 text-xs">
 <div>
 <label
 htmlFor={nameId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.hallNameLabel}
 </label>
 <input
 id={nameId}
 data-testid="input-hall-name"
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={sqftId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.sqftLabel}
 </label>
 <input
 id={sqftId}
 data-testid="input-hall-sqft"
 type="number"
 value={floorAreaSqFt}
 onChange={(e) => setFloorAreaSqFt(Number(e.target.value))}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono tabular-nums"
 required
 />
 </div>

 <div>
 <label
 htmlFor={clusterId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.clusterLayout} Pax
 </label>
 <input
 id={clusterId}
 data-testid="input-hall-cluster-pax"
 type="number"
 value={clusterPax}
 onChange={(e) => setClusterPax(Number(e.target.value))}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono tabular-nums"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={theatreId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.theatreLayout} Pax
 </label>
 <input
 id={theatreId}
 data-testid="input-hall-theatre-pax"
 type="number"
 value={theatrePax}
 onChange={(e) => setTheatrePax(Number(e.target.value))}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono tabular-nums"
 required
 />
 </div>

 <div>
 <label
 htmlFor={acHoursId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.acHoursIncluded}
 </label>
 <input
 id={acHoursId}
 data-testid="input-hall-ac-hours"
 type="number"
 value={includedAcHours}
 onChange={(e) => setIncludedAcHours(Number(e.target.value))}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono tabular-nums"
 required
 />
 </div>
 </div>

 <div>
 <label
 htmlFor={overtimeRateId}
 className="block font-semibold text-slate-700 mb-1"
 >
 {t.overtimeRate} (LKR)
 </label>
 <input
 id={overtimeRateId}
 data-testid="input-hall-overtime-rate"
 type="number"
 value={overtimeHourlyRateLkr}
 onChange={(e) => setOvertimeHourlyRateLkr(Number(e.target.value))}
 className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono tabular-nums"
 required
 />
 </div>

 <div className="flex items-center gap-4 pt-2">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={hasPoruwaStage}
 onChange={(e) => setHasPoruwaStage(e.target.checked)}
 className="h-4 w-4 rounded text-indigo-600"
 />
 <span className="text-slate-700 ">{t.poruwaStage}</span>
 </label>

 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={hasBridalChangingRoom}
 onChange={(e) => setHasBridalChangingRoom(e.target.checked)}
 className="h-4 w-4 rounded text-indigo-600"
 />
 <span className="text-slate-700 ">{t.bridalSuite}</span>
 </label>
 </div>

 <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
 >
 {t.cancelBtn}
 </button>
 <button
 type="submit"
 data-testid="save-hall-submit-btn"
 className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition-colors"
 >
 {t.saveBtn}
 </button>
 </div>
 </form>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main Component
// ============================================================================

export const BanquetHallSetup: FC<BanquetHallSetupProps> = ({
 propertyName = "Galle Face Heritage Hotel & Ballrooms",
 initialHalls = DEFAULT_BANQUET_HALLS,
 language = "en",
 onSaveHall,
 onDeleteHall,
}) => {
 const searchId = useId();
 const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

 const [halls, setHalls] = useState<readonly BanquetHallRecord[]>(initialHalls);
 const [selectedFilter, setSelectedFilter] = useState<HallFilterOption>("ALL");
 const [searchTerm, setSearchTerm] = useState("");
 const [editingHall, setEditingHall] = useState<BanquetHallRecord | null>(null);
 const [isModalOpen, setIsModalOpen] = useState(false);

 const filteredHalls = useMemo(
 () => filterHalls(halls, selectedFilter, searchTerm),
 [halls, selectedFilter, searchTerm],
 );

 const summary = useMemo(() => calculateHallSummary(halls), [halls]);

 const handleToggleActive = (hallId: string) => {
 setHalls((prev) => prev.map((h) => (h.id === hallId ? { ...h, isActive: !h.isActive } : h)));
 };

 const handleSaveModal = (savedHall: BanquetHallRecord) => {
 setHalls((prev) => {
 const exists = prev.some((h) => h.id === savedHall.id);
 if (exists) {
 return prev.map((h) => (h.id === savedHall.id ? savedHall : h));
 }
 return [savedHall, ...prev];
 });
 onSaveHall?.(savedHall);
 setIsModalOpen(false);
 setEditingHall(null);
 };

 const handleDelete = (hallId: string) => {
 setHalls((prev) => prev.filter((h) => h.id !== hallId));
 onDeleteHall?.(hallId);
 };

 const handleOpenAdd = () => {
 setEditingHall(null);
 setIsModalOpen(true);
 };

 const handleOpenEdit = (hall: BanquetHallRecord) => {
 setEditingHall(hall);
 setIsModalOpen(true);
 };

 return (
 <div data-testid="banquet-hall-setup-page" className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
 {propertyName}
 </span>
 <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
 {t.title}
 </h1>
 <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
 </div>

 <button
 type="button"
 data-testid="add-hall-modal-btn"
 onClick={handleOpenAdd}
 className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
 >
 <span>+</span>
 <span>{t.addHallBtn}</span>
 </button>
 </div>

 {/* KPI Overview Summary */}
 <HallSummaryCards summary={summary} t={t} />

 {/* Filter Tabs & Search Bar */}
 <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
 <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100/80 backdrop-blur-md">
 <button
 type="button"
 data-testid="filter-tab-all"
 onClick={() => setSelectedFilter("ALL")}
 className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 selectedFilter === "ALL"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.filterAll}
 </button>
 <button
 type="button"
 data-testid="filter-tab-indoor"
 onClick={() => setSelectedFilter("INDOOR_AIR_CONDITIONED")}
 className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 selectedFilter === "INDOOR_AIR_CONDITIONED"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.filterIndoor}
 </button>
 <button
 type="button"
 data-testid="filter-tab-lawn"
 onClick={() => setSelectedFilter("OUTDOOR_GARDEN_LAWN")}
 className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 selectedFilter === "OUTDOOR_GARDEN_LAWN"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.filterLawn}
 </button>
 <button
 type="button"
 data-testid="filter-tab-rooftop"
 onClick={() => setSelectedFilter("ROOFTOP_TERRACE")}
 className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 selectedFilter === "ROOFTOP_TERRACE"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.filterRooftop}
 </button>
 </div>

 <div className="relative">
 <label htmlFor={searchId} className="sr-only">
 {t.searchPlaceholder}
 </label>
 <input
 id={searchId}
 data-testid="banquet-hall-search-input"
 type="search"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full md:w-80 min-h-[44px] px-4 py-2 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 {/* Venues Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
 {filteredHalls.map((hall) => (
 <HallCard
 key={hall.id}
 hall={hall}
 t={t}
 onEdit={handleOpenEdit}
 onToggleActive={handleToggleActive}
 onDelete={handleDelete}
 />
 ))}
 </div>

 {/* Edit / Add Modal Sheet */}
 <EditHallModal
 isOpen={isModalOpen}
 hall={editingHall}
 t={t}
 onClose={() => {
 setIsModalOpen(false);
 setEditingHall(null);
 }}
 onSave={handleSaveModal}
 />
 </div>
 );
};
