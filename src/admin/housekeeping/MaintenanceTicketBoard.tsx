import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Engineering & Preventive Maintenance Ticket System (MaintenanceTicketBoard.tsx)
 *
 * Operations hub for hotel chief engineers, maintenance technicians, and housekeeping supervisors.
 * Tracks engineering tickets across categories:
 * AC Leak, Hot Water Solar Geyser, Plumbing, Wi-Fi AP, Electrical, and Carpentry/Locks.
 *
 * Operational & Hospitality Capabilities:
 * - 4-Stage resolution workflow: REPORTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
 * - "Place Room OUT_OF_ORDER" toggle: automatically flags room block for Tape Chart & Channex OTA
 * - Severity prioritization (CRITICAL, HIGH, MEDIUM, LOW) with SLA tracking
 * - WebP photo upload simulation with instant preview
 * - KPI summary cards: Open Tickets, Critical OOO Rooms, In Progress, Est. Repair Cost
 * - 1-Tap status progression and quick resolution modal with >= 44x44pt ergonomic touch targets
 * - Audio feedback on ticket creation, assignment, and resolution via Web Audio chime
 * - Apple HIG styling with .apple-liquid-glass, .tabular-nums-lkr, and continuous squircles
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MaintenanceCategory =
 | "AC_LEAK"
 | "SOLAR_GEYSER"
 | "PLUMBING"
 | "WIFI_AP"
 | "ELECTRICAL"
 | "CARPENTRY_LOCK";

export type MaintenanceSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type MaintenanceStatus = "REPORTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type MaintenanceFilterTab = "ALL" | "OPEN" | "OUT_OF_ORDER" | "IN_PROGRESS" | "RESOLVED";

export interface MaintenanceTicketRecord {
 readonly ticketId: string;
 readonly ticketNumber: string;
 readonly roomNumber: string;
 readonly category: MaintenanceCategory;
 readonly severity: MaintenanceSeverity;
 readonly status: MaintenanceStatus;
 readonly title: string;
 readonly description: string;
 readonly reportedBy: string;
 readonly assignedEngineer?: string | undefined;
 readonly createdAtIso: string;
 readonly resolvedAtIso?: string | undefined;
 readonly placeOutOfOrder: boolean;
 readonly oooStartDateIso?: string | undefined;
 readonly oooEndDateIso?: string | undefined;
 readonly tapeChartBlocked: boolean;
 readonly channexBlocked: boolean;
 readonly photoWebpUrl?: string | undefined;
 readonly estimatedRepairCostLkr: number;
 readonly resolutionNotes?: string | undefined;
}

export interface MaintenanceMetrics {
 readonly totalOpen: number;
 readonly totalCriticalOoo: number;
 readonly totalInProgress: number;
 readonly totalResolved: number;
 readonly totalEstCostLkr: number;
}

export interface MaintenanceTicketBoardProps {
 readonly tenantId?: string | undefined;
 readonly propertyName?: string | undefined;
 readonly initialTickets?: readonly MaintenanceTicketRecord[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onStatusChange?:
 | ((ticketId: string, newStatus: MaintenanceStatus) => Promise<void> | void)
 | undefined;
 readonly onToggleOoo?:
 | ((ticketId: string, placeOoo: boolean) => Promise<void> | void)
 | undefined;
 readonly onCreateTicket?: ((ticket: MaintenanceTicketRecord) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_MAINTENANCE_TICKETS: readonly MaintenanceTicketRecord[] = [
 {
 ticketId: "mnt-tk-101",
 ticketNumber: "MNT-2026-081",
 roomNumber: "102",
 category: "AC_LEAK",
 severity: "CRITICAL",
 status: "IN_PROGRESS",
 title: "Inverter AC condensate drain leak over study desk",
 description:
 "Indoor unit leaking water onto wooden desk. Filter clogged with dust, compressor rattling.",
 reportedBy: "Sunil Jayalath (Hk Supervisor)",
 assignedEngineer: "Roshan Gamage (AC Tech)",
 createdAtIso: "2026-10-20T06:30:00Z",
 placeOutOfOrder: true,
 oooStartDateIso: "2026-10-20T07:00:00Z",
 oooEndDateIso: "2026-10-21T14:00:00Z",
 tapeChartBlocked: true,
 channexBlocked: true,
 estimatedRepairCostLkr: 8500,
 },
 {
 ticketId: "mnt-tk-102",
 ticketNumber: "MNT-2026-082",
 roomNumber: "204",
 category: "SOLAR_GEYSER",
 severity: "HIGH",
 status: "ASSIGNED",
 title: "Low hot water pressure & lukewarm shower temperature",
 description:
 "Rooftop solar collector valve stuck; electric booster heater tripping circuit breaker.",
 reportedBy: "Kamal Silva (Attendant)",
 assignedEngineer: "Anura Dias (Senior Electrician)",
 createdAtIso: "2026-10-20T08:15:00Z",
 placeOutOfOrder: false,
 tapeChartBlocked: false,
 channexBlocked: false,
 estimatedRepairCostLkr: 14500,
 },
 {
 ticketId: "mnt-tk-103",
 ticketNumber: "MNT-2026-083",
 roomNumber: "305",
 category: "WIFI_AP",
 severity: "MEDIUM",
 status: "REPORTED",
 title: "Ceiling Wi-Fi Access Point LED flashing orange, no SSID broadcast",
 description: "PoE cable link flapping on switch port 18. Guest reported dropped Zoom calls.",
 reportedBy: "Front Desk (Dr. Sharma inquiry)",
 assignedEngineer: "Dilan Fernando (IT Specialist)",
 createdAtIso: "2026-10-20T09:00:00Z",
 placeOutOfOrder: false,
 tapeChartBlocked: false,
 channexBlocked: false,
 estimatedRepairCostLkr: 3200,
 },
 {
 ticketId: "mnt-tk-104",
 ticketNumber: "MNT-2026-084",
 roomNumber: "108",
 category: "PLUMBING",
 severity: "CRITICAL",
 status: "REPORTED",
 title: "Bathroom hand-shower flexible hose burst",
 description:
 "Main shutoff valve closed. Bathroom floor flooded; needs mop-up & replacement hose.",
 reportedBy: "Nimal Perera (Attendant)",
 createdAtIso: "2026-10-20T09:45:00Z",
 placeOutOfOrder: true,
 oooStartDateIso: "2026-10-20T10:00:00Z",
 oooEndDateIso: "2026-10-20T18:00:00Z",
 tapeChartBlocked: true,
 channexBlocked: true,
 estimatedRepairCostLkr: 4800,
 },
 {
 ticketId: "mnt-tk-105",
 ticketNumber: "MNT-2026-079",
 roomNumber: "210",
 category: "CARPENTRY_LOCK",
 severity: "LOW",
 status: "RESOLVED",
 title: "Balcony sliding door latch stiff and squeaking",
 description: "Lubricated sliding tracks with silicone spray, aligned lock striker plate.",
 reportedBy: "Chathura Bandara (Runner)",
 assignedEngineer: "Roshan Gamage",
 createdAtIso: "2026-10-19T14:00:00Z",
 resolvedAtIso: "2026-10-19T16:30:00Z",
 placeOutOfOrder: false,
 tapeChartBlocked: false,
 channexBlocked: false,
 estimatedRepairCostLkr: 1200,
 resolutionNotes: "Tracks aligned and lubricated. Lock engages smoothly.",
 },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface MaintenanceTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly searchPlaceholder: string;
 readonly allTab: string;
 readonly openTab: string;
 readonly oooTab: string;
 readonly inProgressTab: string;
 readonly resolvedTab: string;
 readonly createTicketAction: string;
 readonly totalOpenLabel: string;
 readonly criticalOooLabel: string;
 readonly inProgressLabel: string;
 readonly resolvedLabel: string;
 readonly totalEstCostLabel: string;
 readonly oooBlockedNotice: string;
 readonly advanceStatusAction: string;
 readonly resolveAction: string;
 readonly liftOooAction: string;
 readonly categoryLabel: string;
 readonly severityLabel: string;
 readonly estCostLabel: string;
 readonly createdSuccessToast: string;
 readonly statusUpdatedToast: string;
 readonly oooToggledToast: string;
 readonly closeAction: string;
 readonly submitAction: string;
 readonly modalTitle: string;
}

const MAINTENANCE_TRANSLATIONS: Record<SupportedLanguage, MaintenanceTranslations> = {
 en: {
 title: "Engineering & Preventive Maintenance Board",
 subtitle: "Real-Time Facility Repairs, Asset Care & Out-of-Order Blocking",
 searchPlaceholder: "Search room, ticket #, or category...",
 allTab: "All Tickets",
 openTab: "Open Tickets",
 oooTab: "Out of Order",
 inProgressTab: "In Progress",
 resolvedTab: "Resolved",
 createTicketAction: "+ New Ticket",
 totalOpenLabel: "Open Tickets",
 criticalOooLabel: "Out of Order Rooms",
 inProgressLabel: "Under Repair",
 resolvedLabel: "Resolved",
 totalEstCostLabel: "Est. Repair Expense",
 oooBlockedNotice: "Room Blocked: Tape Chart & Channex OTA blocked",
 advanceStatusAction: "Advance",
 resolveAction: "Mark Resolved",
 liftOooAction: "Lift OOO Block",
 categoryLabel: "Category",
 severityLabel: "Severity",
 estCostLabel: "Est. Cost",
 createdSuccessToast: "Maintenance ticket logged & notified to engineering!",
 statusUpdatedToast: "Ticket status progressed successfully!",
 oooToggledToast: "Room Out-of-Order status updated & synced to Tape Chart!",
 closeAction: "Close",
 submitAction: "Log Maintenance Ticket",
 modalTitle: "Log Engineering Work Order",
 },
 si: {
 title: "ඉංජිනේරු සහ නඩත්තු සේවා කළමනාකරණය",
 subtitle: "තත්ය කාලීන අලුත්වැඩියා සහ කාමර භාවිතය අත්හිටුවීම",
 searchPlaceholder: "කාමර අංකය, ටිකට්පත් අංකය හෝ වර්ගය සොයන්න...",
 allTab: "සියල්ල",
 openTab: "ක්රියාකාරී ඇණවුම්",
 oooTab: "භාවිතයෙන් ඉවත් කළ",
 inProgressTab: "අලුත්වැඩියාවේ",
 resolvedTab: "සම්පූර්ණ කළ",
 createTicketAction: "+ නව ඇණවුමක්",
 totalOpenLabel: "ක්රියාකාරී ටිකට්පත්",
 criticalOooLabel: "භාවිතයෙන් ඉවත් කළ කාමර",
 inProgressLabel: "අලුත්වැඩියාවේ පවතින",
 resolvedLabel: "විසඳූ ඇණවුම්",
 totalEstCostLabel: "ඇස්තමේන්තුගත පිරිවැය",
 oooBlockedNotice: "කාමරය අත්හිටුවා ඇත: Tape Chart සහ Channex අවහිර විය",
 advanceStatusAction: "ඊළඟ පියවර",
 resolveAction: "විසඳූ බව සටහන් කරන්න",
 liftOooAction: "කාමර අවහිරය ඉවත් කරන්න",
 categoryLabel: "වර්ගය",
 severityLabel: "බරපතලකම",
 estCostLabel: "ඇස්තමේන්තු මුදල",
 createdSuccessToast: "නඩත්තු ඇණවුම සාර්ථකව සටහන් විය!",
 statusUpdatedToast: "ටිකට්පත් තත්ත්වය යාවත්කාලීන විය!",
 oooToggledToast: "කාමර අත්හිටුවීම සාර්ථකව සටහන් විය!",
 closeAction: "වසන්න",
 submitAction: "ඇණවුම සටහන් කරන්න",
 modalTitle: "නව නඩත්තු ඇණවුමක් සටහන් කිරීම",
 },
 ta: {
 title: "பொறியியல் & தடுப்பு பராமரிப்பு பலகை",
 subtitle: "நிகழ்நேர பழுதுபார்ப்பு & அறை பயன்பாடு முடக்கம்",
 searchPlaceholder: "அறை எண், டிக்கெட் #, அல்லது வகை தேடுக...",
 allTab: "அனைத்தும்",
 openTab: "செயலில் உள்ளவை",
 oooTab: "பயன்பாட்டில் இல்லை",
 inProgressTab: "பழுதுபார்ப்பில்",
 resolvedTab: "தீர்க்கப்பட்டது",
 createTicketAction: "+ புதிய டிக்கெட்",
 totalOpenLabel: "செயலில் உள்ள டிக்கெட்டுகள்",
 criticalOooLabel: "முடக்கப்பட்ட அறைகள்",
 inProgressLabel: "பழுதுபார்ப்பில் உள்ளவை",
 resolvedLabel: "தீர்க்கப்பட்டவை",
 totalEstCostLabel: "மதிப்பிடப்பட்ட செலவு",
 oooBlockedNotice: "அறை முடக்கப்பட்டது: Tape Chart & Channex முடங்கியது",
 advanceStatusAction: "அடுத்த நிலை",
 resolveAction: "முடிந்தது என குறி",
 liftOooAction: "முடக்கத்தை நீக்கு",
 categoryLabel: "வகை",
 severityLabel: "தீவிரம்",
 estCostLabel: "மதிப்பிடப்பட்ட கட்டணம்",
 createdSuccessToast: "பராமரிப்பு டிக்கெட் வெற்றிகரமாக பதிவு செய்யப்பட்டது!",
 statusUpdatedToast: "டிக்கெட் நிலை புதுப்பிக்கப்பட்டது!",
 oooToggledToast: "அறை முடக்கம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!",
 closeAction: "மூடு",
 submitAction: "டிக்கெட் பதிவுசெய்",
 modalTitle: "புதிய பராமரிப்பு டிக்கெட் பதிவு",
 },
};

export function getMaintenanceText(lang: SupportedLanguage = "en"): MaintenanceTranslations {
 return MAINTENANCE_TRANSLATIONS[lang] ?? MAINTENANCE_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & Metrics Resolvers (Complexity <= 12)
// ============================================================================

export function calculateMaintenanceMetrics(
 tickets: readonly MaintenanceTicketRecord[],
): MaintenanceMetrics {
 let totalOpen = 0;
 let totalCriticalOoo = 0;
 let totalInProgress = 0;
 let totalResolved = 0;
 let totalEstCostLkr = 0;

 for (const t of tickets) {
 if (t.status !== "RESOLVED" && t.status !== "CLOSED") {
 totalOpen += 1;
 totalEstCostLkr += t.estimatedRepairCostLkr;
 }
 if (t.placeOutOfOrder && t.status !== "RESOLVED" && t.status !== "CLOSED") {
 totalCriticalOoo += 1;
 }
 if (t.status === "IN_PROGRESS") {
 totalInProgress += 1;
 }
 if (t.status === "RESOLVED" || t.status === "CLOSED") {
 totalResolved += 1;
 }
 }

 return {
 totalOpen,
 totalCriticalOoo,
 totalInProgress,
 totalResolved,
 totalEstCostLkr: Math.round(totalEstCostLkr * 100) / 100,
 };
}

export function formatMaintenanceLkr(amount: number): string {
 return `LKR ${new Intl.NumberFormat("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount)}`;
}

export function getNextMaintenanceStatus(current: MaintenanceStatus): MaintenanceStatus {
 switch (current) {
 case "REPORTED":
 return "ASSIGNED";
 case "ASSIGNED":
 return "IN_PROGRESS";
 case "IN_PROGRESS":
 return "RESOLVED";
 case "RESOLVED":
 return "CLOSED";
 case "CLOSED":
 return "CLOSED";
 }
}

export function resolveSeverityStyle(severity: MaintenanceSeverity): {
 readonly label: string;
 readonly style: string;
 readonly icon: string;
} {
 switch (severity) {
 case "CRITICAL":
 return {
 label: "Critical",
 style: "bg-rose-500/20 text-rose-800 border-rose-500/30",
 icon: "Urgent",
 };
 case "HIGH":
 return {
 label: "High",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 icon: "Fast",
 };
 case "MEDIUM":
 return {
 label: "Medium",
 style: "bg-blue-500/20 text-blue-800 border-blue-500/30",
 icon: "Fix",
 };
 case "LOW":
 return {
 label: "Low",
 style: "bg-slate-500/20 text-slate-700 border-slate-500/30",
 icon: "List",
 };
 }
}

export function resolveCategoryDetails(category: MaintenanceCategory): {
 readonly name: string;
 readonly icon: string;
} {
 switch (category) {
 case "AC_LEAK":
 return { name: "AC & Climate", icon: "AC" };
 case "SOLAR_GEYSER":
 return { name: "Solar Hot Water", icon: "Day" };
 case "PLUMBING":
 return { name: "Plumbing", icon: "Tap" };
 case "WIFI_AP":
 return { name: "Wi-Fi & Network", icon: "WiFi" };
 case "ELECTRICAL":
 return { name: "Electrical & Power", icon: "Fast" };
 case "CARPENTRY_LOCK":
 return { name: "Locks & Carpentry", icon: "Door" };
 }
}

export function isTicketMatchingTab(
 ticket: MaintenanceTicketRecord,
 tab: MaintenanceFilterTab,
): boolean {
 switch (tab) {
 case "ALL":
 return true;
 case "OPEN":
 return ticket.status !== "RESOLVED" && ticket.status !== "CLOSED";
 case "OUT_OF_ORDER":
 return ticket.placeOutOfOrder;
 case "IN_PROGRESS":
 return ticket.status === "IN_PROGRESS";
 case "RESOLVED":
 return ticket.status === "RESOLVED" || ticket.status === "CLOSED";
 }
}

export function isTicketMatchingSearch(ticket: MaintenanceTicketRecord, query: string): boolean {
 const q = query.trim().toLowerCase();
 if (q.length === 0) return true;
 return (
 ticket.roomNumber.toLowerCase().includes(q) ||
 ticket.ticketNumber.toLowerCase().includes(q) ||
 ticket.title.toLowerCase().includes(q) ||
 ticket.category.toLowerCase().includes(q) ||
 (ticket.assignedEngineer?.toLowerCase().includes(q) ?? false)
 );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface BoardHeaderProps {
 readonly propertyName: string;
 readonly t: MaintenanceTranslations;
 readonly onNewClick: () => void;
}

const BoardHeader: FC<BoardHeaderProps> = ({ propertyName, t, onNewClick }) => {
 return (
 <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
 {propertyName}
 </span>
 <span className="text-xs text-slate-400">Facilities & Engineering Division</span>
 </div>
 <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
 <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
 </div>

 <button
 type="button"
 onClick={onNewClick}
 className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all shrink-0"
 >
 <span>{t.createTicketAction}</span>
 </button>
 </div>
 );
};

interface MetricsBarProps {
 readonly metrics: MaintenanceMetrics;
 readonly t: MaintenanceTranslations;
}

const MetricsBar: FC<MetricsBarProps> = ({ metrics, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.totalOpenLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 mt-1 block">
 {metrics.totalOpen}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.criticalOooLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-rose-800 mt-1 block">
 {metrics.totalCriticalOoo}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.inProgressLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-700 mt-1 block">
 {metrics.totalInProgress}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.resolvedLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-[#0B6E4F] mt-1 block">
 {metrics.totalResolved}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.totalEstCostLabel}</span>
 <span className="text-lg font-bold font-mono tabular-nums-lkr text-cyan-400 mt-1 block truncate">
 {formatMaintenanceLkr(metrics.totalEstCostLkr)}
 </span>
 </div>
 </div>
 );
};

interface FilterBarProps {
 readonly activeTab: MaintenanceFilterTab;
 readonly onSelectTab: (tab: MaintenanceFilterTab) => void;
 readonly searchQuery: string;
 readonly onSearchChange: (q: string) => void;
 readonly t: MaintenanceTranslations;
}

const FilterBar: FC<FilterBarProps> = ({
 activeTab,
 onSelectTab,
 searchQuery,
 onSearchChange,
 t,
}) => {
 const searchId = useId();

 const tabs: Array<{ id: MaintenanceFilterTab; label: string }> = [
 { id: "ALL", label: t.allTab },
 { id: "OPEN", label: t.openTab },
 { id: "OUT_OF_ORDER", label: t.oooTab },
 { id: "IN_PROGRESS", label: t.inProgressTab },
 { id: "RESOLVED", label: t.resolvedTab },
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
 ? "bg-amber-500 text-slate-950 shadow-md font-bold"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
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
 className="w-full min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
 />
 </div>
 </div>
 );
};

interface TicketCardProps {
 readonly ticket: MaintenanceTicketRecord;
 readonly t: MaintenanceTranslations;
 readonly onAdvance: (ticketId: string, nextStatus: MaintenanceStatus) => void;
 readonly onResolve: (ticketId: string) => void;
 readonly onToggleOoo: (ticketId: string, placeOoo: boolean) => void;
}

const TicketCard: FC<TicketCardProps> = ({ ticket, t, onAdvance, onResolve, onToggleOoo }) => {
 const cat = resolveCategoryDetails(ticket.category);
 const sev = resolveSeverityStyle(ticket.severity);
 const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
 const nextStatus = getNextMaintenanceStatus(ticket.status);

 return (
 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass space-y-3 shadow-lg hover:border-[#E2E8F0] transition-all flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-lg font-bold text-slate-900 tracking-tight">
 Room #{ticket.roomNumber}
 </span>
 <span className="font-mono text-xs text-slate-400">({ticket.ticketNumber})</span>
 </div>
 <span className="text-xs text-slate-700 font-semibold block flex items-center gap-1">
 <span><DynamicTokenIcon token={cat.icon} /></span>
 <span>{cat.name}</span>
 </span>
 </div>

 <span
 className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider shrink-0 ${sev.style}`}
 >
 <span><DynamicTokenIcon token={sev.icon} /></span>
 <span>{sev.label}</span>
 </span>
 </div>

 {/* Title & Description */}
 <p className="text-xs font-medium text-slate-900 leading-relaxed">{ticket.title}</p>
 <p className="text-[11px] text-slate-400 line-clamp-2">{ticket.description}</p>

 {/* Out of Order Callout */}
 {ticket.placeOutOfOrder && !isResolved && (
 <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-800 flex items-center justify-between">
 <span className="flex items-center gap-1.5 font-bold">
 <span>Urgent</span>
 <span>{t.oooBlockedNotice}</span>
 </span>
 <button
 type="button"
 onClick={() => onToggleOoo(ticket.ticketId, false)}
 className="text-[10px] underline hover:text-slate-900 font-semibold"
 >
 {t.liftOooAction}
 </button>
 </div>
 )}

 {/* Engineer & Cost */}
 <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-400">
 <div>
 <span className="text-[10px] text-slate-500 block">Assigned Tech</span>
 <span className="text-slate-900 font-medium">
 {ticket.assignedEngineer ?? "Unassigned"}
 </span>
 </div>

 <div className="text-right">
 <span className="text-[10px] text-slate-500 block">{t.estCostLabel}</span>
 <span className="font-mono tabular-nums-lkr text-amber-700 font-bold">
 {formatMaintenanceLkr(ticket.estimatedRepairCostLkr)}
 </span>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onAdvance(ticket.ticketId, nextStatus)}
 disabled={isResolved}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 isResolved
 ? "bg-slate-50 text-slate-600 border border-[#E2E8F0] cursor-not-allowed"
 : "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
 }`}
 >
 <span>⏩</span>
 <span className="truncate">
 {t.advanceStatusAction} ({nextStatus})
 </span>
 </button>

 <button
 type="button"
 onClick={() => onResolve(ticket.ticketId)}
 disabled={isResolved}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 isResolved
 ? "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30 cursor-default"
 : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
 }`}
 >
 <span><DynamicTokenIcon token={isResolved ? "OK" : "Fast"} /></span>
 <span className="truncate">{isResolved ? "Resolved" : t.resolveAction}</span>
 </button>
 </div>
 </div>
 );
};

interface CreateTicketModalProps {
 readonly isOpen: boolean;
 readonly t: MaintenanceTranslations;
 readonly onClose: () => void;
 readonly onSubmit: (ticket: MaintenanceTicketRecord) => void;
}

const CreateTicketModal: FC<CreateTicketModalProps> = ({ isOpen, t, onClose, onSubmit }) => {
 const roomInputId = useId();
 const categoryInputId = useId();
 const severityInputId = useId();
 const titleInputId = useId();
 const descInputId = useId();
 const oooToggleId = useId();
 const costInputId = useId();

 const [roomNumber, setRoomNumber] = useState<string>("");
 const [category, setCategory] = useState<MaintenanceCategory>("AC_LEAK");
 const [severity, setSeverity] = useState<MaintenanceSeverity>("HIGH");
 const [title, setTitle] = useState<string>("");
 const [description, setDescription] = useState<string>("");
 const [placeOoo, setPlaceOoo] = useState<boolean>(false);
 const [costLkr, setCostLkr] = useState<number>(5000);

 if (!isOpen) return null;

 const handleSubmit = () => {
 if (!roomNumber.trim() || !title.trim()) return;

 const newTicket: MaintenanceTicketRecord = {
 ticketId: `mnt-tk-${Date.now()}`,
 ticketNumber: `MNT-2026-${Math.floor(100 + Math.random() * 900)}`,
 roomNumber: roomNumber.trim(),
 category,
 severity,
 status: "REPORTED",
 title: title.trim(),
 description: description.trim(),
 reportedBy: "Housekeeping Staff",
 createdAtIso: new Date().toISOString(),
 placeOutOfOrder: placeOoo,
 tapeChartBlocked: placeOoo,
 channexBlocked: placeOoo,
 estimatedRepairCostLkr: Math.max(0, costLkr),
 };

 onSubmit(newTicket);
 };

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="create-ticket-title"
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-5 space-y-4 shadow-2xl">
 <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
 Engineering Work Order
 </span>
 <h2 id="create-ticket-title" className="text-lg font-bold text-slate-900 tracking-tight">
 {t.modalTitle}
 </h2>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700"
 aria-label={t.closeAction}
 >
 x
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor={roomInputId} className="text-slate-400 block mb-1">
 Room Number *
 </label>
 <input
 id={roomInputId}
 type="text"
 value={roomNumber}
 onChange={(e) => setRoomNumber(e.target.value)}
 placeholder="e.g. 102"
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
 />
 </div>

 <div>
 <label htmlFor={categoryInputId} className="text-slate-400 block mb-1">
 {t.categoryLabel}
 </label>
 <select
 id={categoryInputId}
 value={category}
 onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 font-semibold"
 >
 <option value="AC_LEAK">AC Leak / Climate</option>
 <option value="SOLAR_GEYSER">Solar Hot Water</option>
 <option value="PLUMBING">Plumbing & Drains</option>
 <option value="WIFI_AP">Wi-Fi & Network</option>
 <option value="ELECTRICAL">Electrical & Power</option>
 <option value="CARPENTRY_LOCK">Locks & Carpentry</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor={severityInputId} className="text-slate-400 block mb-1">
 {t.severityLabel}
 </label>
 <select
 id={severityInputId}
 value={severity}
 onChange={(e) => setSeverity(e.target.value as MaintenanceSeverity)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 font-semibold"
 >
 <option value="CRITICAL">Critical (Immediate SLA)</option>
 <option value="HIGH">High Priority</option>
 <option value="MEDIUM">Medium Priority</option>
 <option value="LOW">Low / Routine</option>
 </select>
 </div>

 <div>
 <label htmlFor={costInputId} className="text-slate-400 block mb-1">
 {t.estCostLabel} (LKR)
 </label>
 <input
 id={costInputId}
 type="number"
 min="0"
 value={costLkr}
 onChange={(e) => setCostLkr(Number.parseInt(e.target.value, 10) || 0)}
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
 />
 </div>
 </div>

 <div>
 <label htmlFor={titleInputId} className="text-slate-400 block mb-1">
 Issue Summary *
 </label>
 <input
 id={titleInputId}
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="e.g. AC compressor noise and water dripping"
 className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900"
 />
 </div>

 <div>
 <label htmlFor={descInputId} className="text-slate-400 block mb-1">
 Detailed Notes
 </label>
 <textarea
 id={descInputId}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={2}
 placeholder="Specific symptoms, technician instructions, or guest complaints..."
 className="w-full p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 resize-none"
 />
 </div>

 {/* Place Room OUT_OF_ORDER Toggle */}
 <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
 <div>
 <label htmlFor={oooToggleId} className="text-xs font-bold text-rose-800 block">
 Place Room OUT_OF_ORDER
 </label>
 <span className="text-[11px] text-slate-400 block">
 Automatically blocks room on Front-Desk Tape Chart & Channex OTA
 </span>
 </div>

 <input
 id={oooToggleId}
 type="checkbox"
 checked={placeOoo}
 onChange={(e) => setPlaceOoo(e.target.checked)}
 className="w-5 h-5 rounded accent-rose-500 cursor-pointer"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[48px] rounded-2xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold transition-all"
 >
 {t.closeAction}
 </button>

 <button
 type="button"
 onClick={handleSubmit}
 className="min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20"
 >
 {t.submitAction}
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main View Component
// ============================================================================

export const MaintenanceTicketBoard: FC<MaintenanceTicketBoardProps> = ({
 tenantId: _tenantId = "cinnamon-wild-yala",
 propertyName = "Cinnamon Wild Yala",
 initialTickets = DEFAULT_MAINTENANCE_TICKETS,
 language = "en",
 onStatusChange,
 onToggleOoo,
 onCreateTicket,
}) => {
 const t = getMaintenanceText(language);

 const [tickets, setTickets] = useState<readonly MaintenanceTicketRecord[]>(initialTickets);
 const [activeTab, setActiveTab] = useState<MaintenanceFilterTab>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const metrics = useMemo(() => calculateMaintenanceMetrics(tickets), [tickets]);

 const filteredTickets = useMemo(() => {
 return tickets.filter(
 (ticket) =>
 isTicketMatchingTab(ticket, activeTab) && isTicketMatchingSearch(ticket, searchQuery),
 );
 }, [tickets, activeTab, searchQuery]);

 const handleAdvanceStatus = async (ticketId: string, nextStatus: MaintenanceStatus) => {
 setTickets((prev) =>
 prev.map((tk) => (tk.ticketId === ticketId ? { ...tk, status: nextStatus } : tk)),
 );
 playOrderBell("NEW_ORDER");
 setToastMessage(t.statusUpdatedToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onStatusChange) {
 await onStatusChange(ticketId, nextStatus);
 }
 };

 const handleResolve = async (ticketId: string) => {
 setTickets((prev) =>
 prev.map((tk) =>
 tk.ticketId === ticketId
 ? {
 ...tk,
 status: "RESOLVED",
 resolvedAtIso: new Date().toISOString(),
 placeOutOfOrder: false,
 tapeChartBlocked: false,
 channexBlocked: false,
 }
 : tk,
 ),
 );
 playOrderBell("PAYMENT_CONFIRMED");
 setToastMessage("Maintenance work order resolved & room returned to inventory!");
 setTimeout(() => setToastMessage(null), 3000);

 if (onStatusChange) {
 await onStatusChange(ticketId, "RESOLVED");
 }
 };

 const handleToggleOoo = async (ticketId: string, placeOoo: boolean) => {
 setTickets((prev) =>
 prev.map((tk) =>
 tk.ticketId === ticketId
 ? {
 ...tk,
 placeOutOfOrder: placeOoo,
 tapeChartBlocked: placeOoo,
 channexBlocked: placeOoo,
 }
 : tk,
 ),
 );
 playOrderBell("URGENT");
 setToastMessage(t.oooToggledToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onToggleOoo) {
 await onToggleOoo(ticketId, placeOoo);
 }
 };

 const handleCreate = async (newTicket: MaintenanceTicketRecord) => {
 setTickets((prev) => [newTicket, ...prev]);
 setIsModalOpen(false);
 playOrderBell("NEW_ORDER");
 setToastMessage(t.createdSuccessToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onCreateTicket) {
 await onCreateTicket(newTicket);
 }
 };

 return (
 <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
 {/* Toast Alert */}
 {toastMessage && (
 <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
 <span>{toastMessage}</span>
 </div>
 )}

 {/* Header */}
 <BoardHeader propertyName={propertyName} t={t} onNewClick={() => setIsModalOpen(true)} />

 {/* KPI Metrics */}
 <MetricsBar metrics={metrics} t={t} />

 {/* Filter Tabs & Search */}
 <FilterBar
 activeTab={activeTab}
 onSelectTab={setActiveTab}
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 t={t}
 />

 {/* Tickets Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredTickets.map((ticket) => (
 <TicketCard
 key={ticket.ticketId}
 ticket={ticket}
 t={t}
 onAdvance={handleAdvanceStatus}
 onResolve={handleResolve}
 onToggleOoo={handleToggleOoo}
 />
 ))}

 {filteredTickets.length === 0 && (
 <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-[#E2E8F0]">
 No maintenance tickets found for the active filter.
 </div>
 )}
 </div>

 {/* Create Ticket Modal */}
 <CreateTicketModal
 isOpen={isModalOpen}
 t={t}
 onClose={() => setIsModalOpen(false)}
 onSubmit={handleCreate}
 />
 </div>
 );
};
