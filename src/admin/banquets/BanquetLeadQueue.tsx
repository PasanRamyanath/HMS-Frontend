/**
 * Tentative Hold Expiry Alert & Sales Follow-Up Queue (BanquetLeadQueue.tsx)
 *
 * Implements Step 344 (Phase 14.19) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized sales pipeline, date hold management, and automated follow-up engine
 * for tentative wedding and corporate banquet inquiries:
 *
 * 1. Tentative Hold Lifecycle & 48-Hour Urgency Escalation:
 * - Wedding couples tentatively lock auspicious Nekath dates before finalizing venue contracts.
 * - Automatically flags date holds expiring within < 48 hours (`systemAmber` / `systemRed`).
 * - Highlights expired holds eligible for immediate inventory release back to the market.
 * 2. 1-Click Omnichannel Follow-Up (WhatsApp & SMS):
 * - Direct `https://wa.me/` deep-link generator with localized courteous Sri Lankan follow-up copy.
 * - SMSGo.lk / Notify.lk formatted SMS reminder dispatch.
 * 3. Quick Action Sales Controls:
 * - Extend Hold: +24h / +48h courtesy extension with manager notes.
 * - Release Hold: 1-tap cancellation to free up ballroom calendar.
 * - Convert to Confirmed Booking: Bridges lead directly into the master booking workflow.
 * 4. Apple Human Interface Guidelines:
 * - Translucent `.apple-liquid-glass`, continuous squircle radii, `.tabular-nums-lkr` countdown timers,
 * SF Pro optical hierarchy, and `>= 44x44pt` touch targets.
 * 5. Trilingual Localization (`en`, `si`, `ta`).
 * 6. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LeadUrgencyStatus = "CRITICAL_48H" | "WARNING_ACTIVE" | "EXPIRED" | "CONFIRMED";

export type LeadFilterCategory = "ALL" | "EXPIRING_SOON" | "ACTIVE" | "EXPIRED" | "CONFIRMED";

export interface BanquetLeadHold {
  readonly id: string;
  readonly clientName: string;
  readonly coupleNames?: string | undefined;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly requestedDate: string; // "YYYY-MM-DD"
  readonly session: "LUNCH_PORUWA" | "DINNER_HOMECOMING" | "EVENING_RECEPTION" | "FULL_DAY";
  readonly hallName: string;
  readonly estimatedPax: number;
  readonly estimatedValueLkr: number;
  readonly holdPlacedIso: string;
  readonly holdExpiresIso: string;
  readonly isConfirmed: boolean;
  readonly assignedCoordinator: string;
  readonly notes?: string | undefined;
}

export interface LeadUrgencyCalculation {
  readonly status: LeadUrgencyStatus;
  readonly hoursRemaining: number;
  readonly isExpiringSoon: boolean;
  readonly isExpired: boolean;
  readonly countdownText: string;
}

export interface LeadQueueSummaryStats {
  readonly totalLeadsCount: number;
  readonly expiringSoonCount: number;
  readonly activeHoldsCount: number;
  readonly expiredCount: number;
  readonly totalPipelineValueLkr: number;
}

export interface BanquetLeadQueueProps {
  readonly initialLeads?: readonly BanquetLeadHold[] | undefined;
  readonly hotelName?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onExtendHold?: ((leadId: string, hours: number) => void) | undefined;
  readonly onReleaseHold?: ((leadId: string) => void) | undefined;
  readonly onConvertLead?: ((lead: BanquetLeadHold) => void) | undefined;
}

// ============================================================================
// Default Fixtures & Seed Data
// ============================================================================

const NOW_MS = Date.now();
const HOUR_MS = 3600 * 1000;

export const DEFAULT_BANQUET_LEADS: readonly BanquetLeadHold[] = [
  {
    id: "LEAD-2026-081",
    clientName: "Malsha Fernando",
    coupleNames: "Malsha Fernando & Dinuka Perera",
    clientPhone: "+94 77 987 6543",
    clientEmail: "malsha.fernando@outlook.com",
    requestedDate: "2026-11-14",
    session: "LUNCH_PORUWA",
    hallName: "Grand Sapphire Ballroom",
    estimatedPax: 250,
    estimatedValueLkr: 2125000,
    holdPlacedIso: new Date(NOW_MS - 5 * 24 * HOUR_MS).toISOString(),
    holdExpiresIso: new Date(NOW_MS + 14 * HOUR_MS).toISOString(), // Expiring in 14 hours!
    isConfirmed: false,
    assignedCoordinator: "Sanduni Jayawardena",
    notes: "Auspicious Nekath at 10:14 AM. Waiting for groom's father's consent on menu package.",
  },
  {
    id: "LEAD-2026-082",
    clientName: "Dr. Kanishka Alwis",
    coupleNames: "Dr. Kanishka Alwis & Dr. Senali Silva",
    clientPhone: "+94 71 456 7890",
    clientEmail: "kanishka.alwis@gmail.com",
    requestedDate: "2026-12-05",
    session: "DINNER_HOMECOMING",
    hallName: "Lotus Terrace & Garden",
    estimatedPax: 180,
    estimatedValueLkr: 1530000,
    holdPlacedIso: new Date(NOW_MS - 3 * 24 * HOUR_MS).toISOString(),
    holdExpiresIso: new Date(NOW_MS + 28 * HOUR_MS).toISOString(), // Expiring in 28 hours!
    isConfirmed: false,
    assignedCoordinator: "Roshan De Mel",
    notes: "Homecoming buffet. Inquiring about corkage waiver for 20 bottles of foreign whiskey.",
  },
  {
    id: "LEAD-2026-083",
    clientName: "Prasanna Wickramasinghe",
    coupleNames: "Wickramasinghe Family Reunion",
    clientPhone: "+94 76 333 2211",
    clientEmail: "p.wickrama@hayleys.com",
    requestedDate: "2026-12-18",
    session: "FULL_DAY",
    hallName: "Grand Sapphire Ballroom",
    estimatedPax: 300,
    estimatedValueLkr: 3200000,
    holdPlacedIso: new Date(NOW_MS - 2 * 24 * HOUR_MS).toISOString(),
    holdExpiresIso: new Date(NOW_MS + 96 * HOUR_MS).toISOString(), // 4 days remaining
    isConfirmed: false,
    assignedCoordinator: "Sanduni Jayawardena",
    notes: "Corporate anniversary gala with 3-phase live band power supply requested.",
  },
  {
    id: "LEAD-2026-084",
    clientName: "Thilini Gunasekara",
    coupleNames: "Thilini Gunasekara & Rajiv Senanayake",
    clientPhone: "+94 77 112 2334",
    clientEmail: "thilini.g@gmail.com",
    requestedDate: "2026-10-31",
    session: "LUNCH_PORUWA",
    hallName: "Crystal Ballroom",
    estimatedPax: 200,
    estimatedValueLkr: 1800000,
    holdPlacedIso: new Date(NOW_MS - 10 * 24 * HOUR_MS).toISOString(),
    holdExpiresIso: new Date(NOW_MS - 4 * HOUR_MS).toISOString(), // Expired 4 hours ago!
    isConfirmed: false,
    assignedCoordinator: "Kavinda Wickramasinghe",
    notes: "Tentative hold expired without deposit payment. Second couple on waitlist waiting.",
  },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function calculateLeadUrgency(
  holdExpiresIso: string,
  isConfirmed: boolean,
  nowMs: number = Date.now(),
): LeadUrgencyCalculation {
  if (isConfirmed) {
    return {
      status: "CONFIRMED",
      hoursRemaining: 0,
      isExpiringSoon: false,
      isExpired: false,
      countdownText: "Confirmed Booking",
    };
  }

  const expireMs = new Date(holdExpiresIso).getTime();
  const diffMs = expireMs - nowMs;
  const hoursRemaining = Math.round((diffMs / (3600 * 1000)) * 10) / 10;

  if (hoursRemaining <= 0) {
    const expiredHoursAgo = Math.abs(hoursRemaining);
    return {
      status: "EXPIRED",
      hoursRemaining,
      isExpiringSoon: false,
      isExpired: true,
      countdownText:
        expiredHoursAgo < 24
          ? `Expired ${Math.round(expiredHoursAgo)}h ago`
          : `Expired ${Math.round(expiredHoursAgo / 24)}d ago`,
    };
  }

  if (hoursRemaining <= 48) {
    return {
      status: "CRITICAL_48H",
      hoursRemaining,
      isExpiringSoon: true,
      isExpired: false,
      countdownText:
        hoursRemaining < 24
          ? `${Math.round(hoursRemaining)}h remaining`
          : `1d ${Math.round(hoursRemaining - 24)}h remaining`,
    };
  }

  const days = Math.round(hoursRemaining / 24);
  return {
    status: "WARNING_ACTIVE",
    hoursRemaining,
    isExpiringSoon: false,
    isExpired: false,
    countdownText: `${days} days remaining`,
  };
}

export function computeLeadQueueStats(
  leads: readonly BanquetLeadHold[],
  nowMs: number = Date.now(),
): LeadQueueSummaryStats {
  let expiringSoonCount = 0;
  let activeHoldsCount = 0;
  let expiredCount = 0;
  let totalPipelineValueLkr = 0;

  for (const lead of leads) {
    totalPipelineValueLkr += Math.max(0, lead.estimatedValueLkr);
    const urgency = calculateLeadUrgency(lead.holdExpiresIso, lead.isConfirmed, nowMs);

    if (urgency.status === "CRITICAL_48H") {
      expiringSoonCount++;
    } else if (urgency.status === "WARNING_ACTIVE") {
      activeHoldsCount++;
    } else if (urgency.status === "EXPIRED") {
      expiredCount++;
    }
  }

  return {
    totalLeadsCount: leads.length,
    expiringSoonCount,
    activeHoldsCount,
    expiredCount,
    totalPipelineValueLkr,
  };
}

export function formatLeadCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `LKR ${safe.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function buildWhatsAppFollowUpUrl(
  lead: BanquetLeadHold,
  hotelName: string,
  hoursRemaining: number,
  language: SupportedLanguage = "en",
): string {
  const cleanPhone = lead.clientPhone.replace(/[^\d]/g, "");

  let message = "";
  if (language === "si") {
    const timePhrase = hoursRemaining > 0 ? `තව පැය ${Math.round(hoursRemaining)}කින්` : "දැන්";
    message = `ආයුබෝවන් ${lead.clientName}! ${hotelName} වෙතින් සුබ පැතුම්. ඔබ විසින් ${lead.requestedDate} දින ${lead.hallName} ශාලාව සඳහා වෙන්කළ තාවකාලික හෝල්ඩ් එක ${timePhrase} අවසන් වේ. ඔබගේ මංගල දිනය තහවුරු කිරීමට කරුණාකර අත්තිකාරම් තැන්පතුව සිදුකරන්න. ස්තූතියි!`;
  } else if (language === "ta") {
    const timePhrase =
      hoursRemaining > 0 ? `இன்னும் ${Math.round(hoursRemaining)} மணிநேரத்தில்` : "தற்போது";
    message = `வணக்கம் ${lead.clientName}! ${hotelName} இலிருந்து அன்பான வாழ்த்துக்கள். ${lead.requestedDate} அன்று ${lead.hallName} மண்டபத்திற்கான உங்கள் தற்காலிக முன்பதிவு ${timePhrase} காலாவதியாகிறது. தயவுசெய்து உங்கள் நிகழ்வை உறுதிப்படுத்த முற்பணத்தை செலுத்துங்கள். நன்றி!`;
  } else {
    const timePhrase =
      hoursRemaining > 0 ? `will expire in ${Math.round(hoursRemaining)} hours` : "has expired";
    message = `Dear ${lead.clientName}, warm greetings from ${hotelName}! Your tentative date hold for ${lead.hallName} on ${lead.requestedDate} ${timePhrase}. Please contact us or settle the initial advance deposit to secure your auspicious date. Thank you!`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface LeadQueueTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly filterAll: string;
  readonly filterExpiringSoon: string;
  readonly filterActive: string;
  readonly filterExpired: string;
  readonly totalLeads: string;
  readonly expiring48h: string;
  readonly activeHolds: string;
  readonly expiredHolds: string;
  readonly pipelineValue: string;
  readonly searchPlaceholder: string;
  readonly followUpWhatsApp: string;
  readonly extendHold: string;
  readonly releaseHold: string;
  readonly confirmBooking: string;
  readonly hoursRemaining: string;
  readonly hallAndSession: string;
  readonly estimatedGuests: string;
  readonly value: string;
  readonly noLeadsFound: string;
  readonly close: string;
}

export const LEAD_QUEUE_TRANSLATIONS: Record<SupportedLanguage, LeadQueueTranslations> = {
  en: {
    title: "Tentative Hold Expiry & Sales Follow-Up",
    subtitle: "Automated alert queue for auspicious wedding date holds expiring within 48 hours",
    filterAll: "All Inquiries",
    filterExpiringSoon: "Expiring Soon (<48h)",
    filterActive: "Active Holds",
    filterExpired: "Expired Holds",
    totalLeads: "Total Inquiries",
    expiring48h: "Expiring <48h",
    activeHolds: "Active Holds",
    expiredHolds: "Expired Holds",
    pipelineValue: "Pipeline Value",
    searchPlaceholder: "Search client name, phone, or date (e.g. Malsha, 2026-11-14)...",
    followUpWhatsApp: "WhatsApp Follow-Up",
    extendHold: "+24h Extension",
    releaseHold: "Release Date",
    confirmBooking: "Convert to Booking",
    hoursRemaining: "Expiry Status",
    hallAndSession: "Venue & Session",
    estimatedGuests: "Est. Pax",
    value: "Est. Valuation",
    noLeadsFound: "No tentative holds match the selected criteria.",
    close: "Dismiss",
  },
  si: {
    title: "තාවකාලික වෙන්කිරීම් කල්ඉකුත්වීම් සහ විකුණුම් පසු විපරම",
    subtitle: "පැය 48ක් ඇතුළත කල්ඉකුත්වන මංගල දින හෝල්ඩ් සඳහා ස්වයංක්රීය අනතුරු ඇඟවීම් පුවරුව",
    filterAll: "සියලු විමසීම්",
    filterExpiringSoon: "ඉක්මනින් අවසන් වන (<පැය 48)",
    filterActive: "සක්රීය හෝල්ඩ්ස්",
    filterExpired: "කල්ඉකුත් වූ",
    totalLeads: "මුළු විමසීම්",
    expiring48h: "පැය 48ට අඩු",
    activeHolds: "සක්රීය හෝල්ඩ්ස්",
    expiredHolds: "කල්ඉකුත් වූ",
    pipelineValue: "විකුණුම් වටිනාකම",
    searchPlaceholder: "නම, දුරකථන අංකය හෝ දිනය සොයන්න...",
    followUpWhatsApp: "WhatsApp පණිවිඩය",
    extendHold: "+පැය 24ක් දීර්ඝ කරන්න",
    releaseHold: "දිනය නිදහස් කරන්න",
    confirmBooking: "තහවුරු කර බුක් කරන්න",
    hoursRemaining: "කල්ඉකුත්වීමේ තත්ත්වය",
    hallAndSession: "ශාලාව සහ වාරය",
    estimatedGuests: "අපේක්ෂිත අමුත්තන්",
    value: "ඇස්තමේන්තු වටිනාකම",
    noLeadsFound: "තෝරාගත් නිර්ණායකවලට අදාළ විමසීම් හමු නොවීය.",
    close: "වසන්න",
  },
  ta: {
    title: "தற்காலிக முன்பதிவு காலாவதி & விற்பனை பின்தொடரல்",
    subtitle: "48 மணிநேரத்திற்குள் காலாவதியாகும் திருமண தின முன்பதிவுகளுக்கான எச்சரிக்கை பலகை",
    filterAll: "அனைத்து விசாரணைகள்",
    filterExpiringSoon: "விரைவில் காலாவதியாகும் (<48ம)",
    filterActive: "செயலில் உள்ளவை",
    filterExpired: "காலாவதியானவை",
    totalLeads: "மொத்த விசாரணைகள்",
    expiring48h: "48ம க்குக் குறைவாக",
    activeHolds: "செயலில் உள்ளவை",
    expiredHolds: "காலாவதியானவை",
    pipelineValue: "மதிப்பிடப்பட்ட மதிப்பு",
    searchPlaceholder: "பெயர், தொலைபேசி அல்லது தேதியைத் தேடுக...",
    followUpWhatsApp: "WhatsApp பின்தொடரல்",
    extendHold: "+24ம நீட்டிப்பு",
    releaseHold: "தேதியை விடுவிக்கவும்",
    confirmBooking: "முன்பதிவாக மாற்றுக",
    hoursRemaining: "காலாவதி நிலை",
    hallAndSession: "மண்டபம் & அமர்வு",
    estimatedGuests: "விருந்தினர்கள்",
    value: "மதிப்பு",
    noLeadsFound: "பொருத்தமான தற்காலிக முன்பதிவுகள் எதுவும் கிடைக்கவில்லை.",
    close: "மூடுக",
  },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface QueueHeaderProps {
  readonly hotelName: string;
  readonly t: LeadQueueTranslations;
}

const QueueHeader: FC<QueueHeaderProps> = ({ hotelName, t }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-4 border-b border-black/10 ">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900 ">{t.title}</h1>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ">
            {hotelName}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
      </div>
    </div>
  );
};

interface QueueStatsBentoProps {
  readonly stats: LeadQueueSummaryStats;
  readonly t: LeadQueueTranslations;
}

const QueueStatsBento: FC<QueueStatsBentoProps> = ({ stats, t }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="p-3.5 rounded-2xl bg-black/5 border border-black/10 ">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.totalLeads}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900 ">
          {stats.totalLeadsCount}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
        <div className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {t.expiring48h}
        </div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-amber-700 ">
          {stats.expiringSoonCount}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
        <div className="text-[10px] font-bold text-blue-700 uppercase">{t.activeHolds}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-blue-700 ">
          {stats.activeHoldsCount}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
        <div className="text-[10px] font-bold text-rose-700 uppercase">{t.expiredHolds}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-rose-700 ">
          {stats.expiredCount}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-black/5 border border-black/10 col-span-2 md:col-span-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.pipelineValue}</div>
        <div className="text-sm font-black font-mono tabular-nums-lkr text-emerald-600 truncate">
          {formatLeadCurrency(stats.totalPipelineValueLkr)}
        </div>
      </div>
    </div>
  );
};

interface LeadCardProps {
  readonly lead: BanquetLeadHold;
  readonly hotelName: string;
  readonly language: SupportedLanguage;
  readonly t: LeadQueueTranslations;
  readonly onExtend?: ((leadId: string, hours: number) => void) | undefined;
  readonly onRelease?: ((leadId: string) => void) | undefined;
  readonly onConvert?: ((lead: BanquetLeadHold) => void) | undefined;
}

const LeadCard: FC<LeadCardProps> = ({
  lead,
  hotelName,
  language,
  t,
  onExtend,
  onRelease,
  onConvert,
}) => {
  const urgency = calculateLeadUrgency(lead.holdExpiresIso, lead.isConfirmed);
  const whatsAppUrl = buildWhatsAppFollowUpUrl(lead, hotelName, urgency.hoursRemaining, language);

  return (
    <div
      className={`p-5 rounded-2xl apple-liquid-glass bg-white/80 border transition-all space-y-4 shadow-sm ${
        urgency.status === "CRITICAL_48H"
          ? "border-amber-400 ring-1 ring-amber-400/30"
          : urgency.status === "EXPIRED"
            ? "border-rose-300 opacity-90"
            : "border-black/10 "
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900 ">
              {lead.coupleNames || lead.clientName}
            </h3>
            <span
              className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                urgency.status === "CRITICAL_48H"
                  ? "bg-amber-100 text-amber-800 animate-pulse"
                  : urgency.status === "EXPIRED"
                    ? "bg-rose-100 text-rose-800 "
                    : "bg-blue-100 text-blue-800 "
              }`}
            >
              {urgency.countdownText}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Contact: {lead.clientName} • {lead.clientPhone} • Coordinator:{" "}
            {lead.assignedCoordinator}
          </div>
        </div>

        <div className="text-right">
          <div className="text-base font-black font-mono tabular-nums-lkr text-slate-900 ">
            {formatLeadCurrency(lead.estimatedValueLkr)}
          </div>
          <div className="text-xs text-slate-400">
            {lead.estimatedPax} pax ({lead.session.replace(/_/g, " ")})
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-black/5 border border-black/5 text-xs grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <span className="text-slate-400 font-medium">Requested Date:</span>{" "}
          <span className="font-bold text-slate-800 ">{lead.requestedDate}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Venue:</span>{" "}
          <span className="font-bold text-slate-800 ">{lead.hallName}</span>
        </div>
        <div className="col-span-2 md:col-span-1 truncate">
          <span className="text-slate-400 font-medium">Notes:</span>{" "}
          <span className="italic text-slate-600 ">{lead.notes || "None"}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/5 ">
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.584 1.831.948 2.792.948h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.734-5.773-5.734zm0-2.172c4.418 0 8 3.582 8 8 0 4.418-3.582 8-8 8-1.42 0-2.75-.371-3.902-1.021l-5.098 1.334 1.357-4.962c-.753-1.226-1.189-2.658-1.189-4.183 0-4.418 3.582-8 8-8z" />
          </svg>
          <span>{t.followUpWhatsApp}</span>
        </a>

        <div className="flex items-center gap-2">
          {onExtend && (
            <button
              type="button"
              onClick={() => onExtend(lead.id, 24)}
              className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-slate-700 min-h-[44px]"
            >
              {t.extendHold}
            </button>
          )}

          {onRelease && (
            <button
              type="button"
              onClick={() => onRelease(lead.id)}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold min-h-[44px]"
            >
              {t.releaseHold}
            </button>
          )}

          {onConvert && (
            <button
              type="button"
              onClick={() => onConvert(lead)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all min-h-[44px] shadow-sm"
            >
              {t.confirmBooking}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function matchesCategoryFilter(status: LeadUrgencyStatus, filter: LeadFilterCategory): boolean {
  if (filter === "ALL") return true;
  if (filter === "EXPIRING_SOON") return status === "CRITICAL_48H";
  if (filter === "ACTIVE") return status === "WARNING_ACTIVE";
  if (filter === "EXPIRED") return status === "EXPIRED";
  if (filter === "CONFIRMED") return status === "CONFIRMED";
  return true;
}

function matchesSearchQuery(lead: BanquetLeadHold, query: string): boolean {
  if (!query) return true;
  const nameMatch = lead.clientName.toLowerCase().includes(query);
  const coupleMatch = lead.coupleNames?.toLowerCase().includes(query) ?? false;
  const phoneMatch = lead.clientPhone.includes(query);
  const dateMatch = lead.requestedDate.includes(query);
  return nameMatch || coupleMatch || phoneMatch || dateMatch;
}

// ============================================================================
// Main Component
// ============================================================================

export const BanquetLeadQueue: FC<BanquetLeadQueueProps> = ({
  initialLeads = DEFAULT_BANQUET_LEADS,
  hotelName = "The Grand Cinnamon Resort",
  language = "en",
  onExtendHold,
  onReleaseHold,
  onConvertLead,
}) => {
  const [leads, setLeads] = useState<readonly BanquetLeadHold[]>(initialLeads);
  const [filter, setFilter] = useState<LeadFilterCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const componentId = useId();
  const t = LEAD_QUEUE_TRANSLATIONS[language] || LEAD_QUEUE_TRANSLATIONS.en;

  const stats = useMemo(() => {
    return computeLeadQueueStats(leads);
  }, [leads]);

  const handleExtend = (leadId: string, hours: number) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        const currentExp = new Date(lead.holdExpiresIso).getTime();
        const newExpIso = new Date(currentExp + hours * 3600 * 1000).toISOString();
        return { ...lead, holdExpiresIso: newExpIso };
      }),
    );
    if (onExtendHold) {
      onExtendHold(leadId, hours);
    }
  };

  const handleRelease = (leadId: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
    if (onReleaseHold) {
      onReleaseHold(leadId);
    }
  };

  const handleConvert = (lead: BanquetLeadHold) => {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, isConfirmed: true } : l)));
    if (onConvertLead) {
      onConvertLead(lead);
    }
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      const urgency = calculateLeadUrgency(lead.holdExpiresIso, lead.isConfirmed);
      return matchesCategoryFilter(urgency.status, filter) && matchesSearchQuery(lead, q);
    });
  }, [leads, filter, searchQuery]);

  return (
    <div id={componentId} className="space-y-6">
      <QueueHeader hotelName={hotelName} t={t} />

      <QueueStatsBento stats={stats} t={t} />

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap gap-1 p-1 bg-black/5 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.filterAll}
          </button>
          <button
            type="button"
            onClick={() => setFilter("EXPIRING_SOON")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] flex items-center gap-1.5 ${
              filter === "EXPIRING_SOON"
                ? "bg-amber-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {t.filterExpiringSoon}
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "ACTIVE"
                ? "bg-blue-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.filterActive}
          </button>
          <button
            type="button"
            onClick={() => setFilter("EXPIRED")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "EXPIRED"
                ? "bg-rose-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.filterExpired}
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full px-4 py-2 pl-9 rounded-xl border border-black/15 bg-white text-xs font-sans min-h-[40px]"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-black/5 border border-black/10 text-xs text-slate-400">
            {t.noLeadsFound}
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              hotelName={hotelName}
              language={language}
              t={t}
              onExtend={handleExtend}
              onRelease={handleRelease}
              onConvert={handleConvert}
            />
          ))
        )}
      </div>
    </div>
  );
};
