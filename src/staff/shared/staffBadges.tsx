import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Shared Apple HIG Status Badges for KDS, POS & Runner (staffBadges.tsx)
 *
 * Implements unified Apple dynamic system status pills across kitchen,
 * bar, and dining floor modules without code duplication.
 *
 * Design Standards:
 * - Apple HIG dynamic vibrancy tokens with subtle specular borders
 * - Tabular numerals on timers (.tabular-nums-lkr)
 * - Trilingual label resolution (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import type { FC, HTMLAttributes } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// 1. SLA Urgency Badge
// ============================================================================

export type SlaUrgencyLevel = "ON_TIME" | "APPROACHING_SLA" | "OVERDUE";

export interface SlaBadgeTheme {
 readonly level: SlaUrgencyLevel;
 readonly badgeBg: string;
 readonly badgeText: string;
 readonly borderClass: string;
 readonly icon: string;
 readonly label: string;
}

const SLA_LABELS: Record<SlaUrgencyLevel, Record<SupportedLanguage, string>> = {
 OVERDUE: { en: "OVERDUE", si: "ප්රමාදයි", ta: "தாமதம்" },
 APPROACHING_SLA: { en: "EXPEDITE", si: "ඉක්මන් කරන්න", ta: "விரைவுபடுத்து" },
 ON_TIME: { en: "ON TIME", si: "නියමිත වේලාව", ta: "சரியான நேரம்" },
};

const SLA_STYLES: Record<
 SlaUrgencyLevel,
 {
 readonly badgeBg: string;
 readonly badgeText: string;
 readonly borderClass: string;
 readonly icon: string;
 }
> = {
 OVERDUE: {
 badgeBg: "bg-rose-500/20",
 badgeText: "text-rose-800 font-extrabold",
 borderClass: "border-rose-500/40 animate-pulse",
 icon: "Alert",
 },
 APPROACHING_SLA: {
 badgeBg: "bg-amber-500/20",
 badgeText: "text-amber-700 font-bold",
 borderClass: "border-amber-500/30",
 icon: "Wait",
 },
 ON_TIME: {
 badgeBg: "bg-emerald-500/15",
 badgeText: "text-[#0B6E4F] font-medium",
 borderClass: "border-emerald-500/25",
 icon: "Timer",
 },
};

export function getSlaBadgeStyle(
 urgency: SlaUrgencyLevel,
 lang: SupportedLanguage = "en",
): SlaBadgeTheme {
 const safeLevel: SlaUrgencyLevel = SLA_STYLES[urgency] ? urgency : "ON_TIME";
 const style = SLA_STYLES[safeLevel];
 const label = SLA_LABELS[safeLevel][lang] ?? SLA_LABELS[safeLevel].en;

 return {
 level: safeLevel,
 badgeBg: style.badgeBg,
 badgeText: style.badgeText,
 borderClass: style.borderClass,
 icon: style.icon,
 label,
 };
}

export interface SlaBadgeProps extends HTMLAttributes<HTMLSpanElement> {
 readonly urgency: SlaUrgencyLevel;
 readonly elapsedText?: string | undefined;
 readonly lang?: SupportedLanguage | undefined;
 readonly showIcon?: boolean | undefined;
}

export const SlaBadge: FC<SlaBadgeProps> = ({
 urgency,
 elapsedText,
 lang = "en",
 showIcon = true,
 className = "",
 ...rest
}) => {
 const theme = getSlaBadgeStyle(urgency, lang);

 return (
 <span
 data-testid={`sla-badge-${urgency.toLowerCase()}`}
 className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border backdrop-blur-md select-none transition-apple-spring ${theme.badgeBg} ${theme.badgeText} ${theme.borderClass} ${className}`}
 {...rest}
 >
 {showIcon ? <span aria-hidden="true"><DynamicTokenIcon token={theme.icon} /></span> : null}
 <span>{theme.label}</span>
 {elapsedText ? (
 <span className="font-mono tabular-nums-lkr tabular-nums text-[11px] opacity-90 ml-0.5">
 ({elapsedText})
 </span>
 ) : null}
 </span>
 );
};

// ============================================================================
// 2. Ticket Department Badge (KOT / BOT / POS)
// ============================================================================

export type TicketDepartmentType = "KOT" | "BOT" | "POS";

export interface TicketDepartmentStyle {
 readonly badgeClass: string;
 readonly label: string;
 readonly icon: string;
}

const TICKET_DEPT_LABELS: Record<TicketDepartmentType, Record<SupportedLanguage, string>> = {
 BOT: { en: "BAR BOT", si: "බාර් BOT", ta: "பார் BOT" },
 POS: { en: "WAITER POS", si: "වේටර් POS", ta: "பணியாளர் POS" },
 KOT: { en: "KITCHEN KOT", si: "කුස්සිය KOT", ta: "சமையலறை KOT" },
};

const TICKET_DEPT_STYLES: Record<
 TicketDepartmentType,
 { readonly badgeClass: string; readonly icon: string }
> = {
 BOT: {
 badgeClass: "bg-sky-500/20 text-sky-800 border-sky-400/30",
 icon: "Bar",
 },
 POS: {
 badgeClass: "bg-purple-500/20 text-purple-800 border-purple-400/30",
 icon: "Note",
 },
 KOT: {
 badgeClass: "bg-amber-500/20 text-amber-800 border-amber-400/30",
 icon: "Kitchen",
 },
};

export function getTicketDepartmentStyle(
 type: TicketDepartmentType | string,
 lang: SupportedLanguage = "en",
): TicketDepartmentStyle {
 const normalized = type.toUpperCase().trim() as TicketDepartmentType;
 const safeType: TicketDepartmentType = TICKET_DEPT_STYLES[normalized] ? normalized : "KOT";
 const style = TICKET_DEPT_STYLES[safeType];
 const label = TICKET_DEPT_LABELS[safeType][lang] ?? TICKET_DEPT_LABELS[safeType].en;

 return {
 badgeClass: style.badgeClass,
 label,
 icon: style.icon,
 };
}

export interface TicketDepartmentBadgeProps extends HTMLAttributes<HTMLSpanElement> {
 readonly ticketType: TicketDepartmentType | string;
 readonly lang?: SupportedLanguage | undefined;
}

export const TicketDepartmentBadge: FC<TicketDepartmentBadgeProps> = ({
 ticketType,
 lang = "en",
 className = "",
 ...rest
}) => {
 const style = getTicketDepartmentStyle(ticketType, lang);

 return (
 <span
 data-testid="ticket-department-badge"
 className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border select-none ${style.badgeClass} ${className}`}
 {...rest}
 >
 <span aria-hidden="true"><DynamicTokenIcon token={style.icon} /></span>
 <span>{style.label}</span>
 </span>
 );
};

// ============================================================================
// 3. Destination Badge (Table / Room / Cabana / Takeaway)
// ============================================================================

export type DestinationType = "TABLE" | "ROOM" | "CABANA" | "TAKEAWAY";

export interface DestinationStyle {
 readonly badgeClass: string;
 readonly icon: string;
 readonly label: string;
}

const DESTINATION_LABELS: Record<DestinationType, Record<SupportedLanguage, string>> = {
 ROOM: { en: "Room", si: "කාමරය", ta: "அறை" },
 CABANA: { en: "Cabana", si: "කබානා", ta: "கபானா" },
 TAKEAWAY: { en: "Takeaway", si: "පාර්සල්", ta: "பார்சல்" },
 TABLE: { en: "Table", si: "මේසය", ta: "மேசை" },
};

const DESTINATION_STYLES: Record<
 DestinationType,
 { readonly badgeClass: string; readonly icon: string }
> = {
 ROOM: {
 badgeClass: "bg-indigo-500/20 text-indigo-800 border-indigo-400/30",
 icon: "Room",
 },
 CABANA: {
 badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
 icon: "Cabana",
 },
 TAKEAWAY: {
 badgeClass: "bg-purple-500/20 text-purple-800 border-purple-400/30",
 icon: "Bag",
 },
 TABLE: {
 badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-400/30",
 icon: "Dining",
 },
};

export function getDestinationBadgeStyle(
 type: DestinationType | string,
 lang: SupportedLanguage = "en",
): DestinationStyle {
 const normalized = type.toUpperCase().trim() as DestinationType;
 const safeType: DestinationType = DESTINATION_STYLES[normalized] ? normalized : "TABLE";
 const style = DESTINATION_STYLES[safeType];
 const label = DESTINATION_LABELS[safeType][lang] ?? DESTINATION_LABELS[safeType].en;

 return {
 badgeClass: style.badgeClass,
 icon: style.icon,
 label,
 };
}

export interface DestinationBadgeProps extends HTMLAttributes<HTMLSpanElement> {
 readonly destinationType: DestinationType | string;
 readonly destinationNumber?: string | undefined;
 readonly lang?: SupportedLanguage | undefined;
}

export const DestinationBadge: FC<DestinationBadgeProps> = ({
 destinationType,
 destinationNumber,
 lang = "en",
 className = "",
 ...rest
}) => {
 const style = getDestinationBadgeStyle(destinationType, lang);

 return (
 <span
 data-testid="destination-badge"
 className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border select-none ${style.badgeClass} ${className}`}
 {...rest}
 >
 <span aria-hidden="true"><DynamicTokenIcon token={style.icon} /></span>
 <span>
 {style.label}
 {destinationNumber ? ` ${destinationNumber}` : ""}
 </span>
 </span>
 );
};

// ============================================================================
// 4. Dietary & Allergen Badge
// ============================================================================

export const DIETARY_STYLES: Record<string, { badgeClass: string; icon: string }> = {
 VEGAN: {
 badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 icon: "Vegan",
 },
 VEGETARIAN: {
 badgeClass: "bg-green-500/20 text-green-300 border-green-500/30",
 icon: "Veg",
 },
 HALAL: {
 badgeClass: "bg-sky-500/20 text-sky-800 border-sky-500/30",
 icon: "Halal",
 },
 GLUTEN_FREE: {
 badgeClass: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 icon: "Grain",
 },
 DAIRY_FREE: {
 badgeClass: "bg-indigo-500/20 text-indigo-800 border-indigo-500/30",
 icon: "Milk",
 },
 NUT_FREE: {
 badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
 icon: "Nuts",
 },
 SPICY: {
 badgeClass: "bg-rose-500/20 text-rose-800 border-rose-500/30",
 icon: "Spicy",
 },
};

export function getDietaryBadgeStyle(dietary: string): { badgeClass: string; icon: string } {
 const key = dietary.toUpperCase().trim().replace(/[-\s]/g, "_");
 return (
 DIETARY_STYLES[key] ?? {
 badgeClass: "bg-slate-700/50 text-slate-700 border-slate-600/30",
 icon: "Tag",
 }
 );
}

export interface DietaryBadgeProps extends HTMLAttributes<HTMLSpanElement> {
 readonly dietary: string;
 readonly showIcon?: boolean | undefined;
}

export const DietaryBadge: FC<DietaryBadgeProps> = ({
 dietary,
 showIcon = true,
 className = "",
 ...rest
}) => {
 const style = getDietaryBadgeStyle(dietary);
 const formattedLabel = dietary.replace(/_/g, " ");

 return (
 <span
 data-testid={`dietary-badge-${dietary.toLowerCase()}`}
 className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded border select-none ${style.badgeClass} ${className}`}
 {...rest}
 >
 {showIcon ? <span aria-hidden="true"><DynamicTokenIcon token={style.icon} /></span> : null}
 <span>{formattedLabel}</span>
 </span>
 );
};

// ============================================================================
// 5. Meal Plan Badge (RO / BB / HB / FB / AI)
// ============================================================================

const DEFAULT_MEAL_PLAN_STYLE = "bg-slate-500/25 text-slate-700 border-slate-400/40";

const MEAL_PLAN_STYLES: Record<string, string> = {
 AI: "bg-purple-500/25 text-purple-800 border-purple-400/40",
 FB: "bg-indigo-500/25 text-indigo-800 border-indigo-400/40",
 HB: "bg-sky-500/25 text-sky-800 border-sky-400/40",
 BB: "bg-emerald-500/25 text-[#0B6E4F] border-emerald-400/40",
 RO: DEFAULT_MEAL_PLAN_STYLE,
};

export function getMealPlanBadgeStyle(mealPlan: string): string {
 const normalized = mealPlan.toUpperCase().trim();
 return MEAL_PLAN_STYLES[normalized] ?? DEFAULT_MEAL_PLAN_STYLE;
}

export interface MealPlanBadgeProps extends HTMLAttributes<HTMLSpanElement> {
 readonly planCode: string;
}

export const MealPlanBadge: FC<MealPlanBadgeProps> = ({ planCode, className = "", ...rest }) => {
 const badgeStyle = getMealPlanBadgeStyle(planCode);

 return (
 <span
 data-testid={`meal-plan-badge-${planCode.toLowerCase()}`}
 className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md border select-none ${badgeStyle} ${className}`}
 {...rest}
 >
 {planCode.toUpperCase()}
 </span>
 );
};
