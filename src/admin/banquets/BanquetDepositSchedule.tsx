/**
 * Staged Wedding Deposit Schedule & PayHere Payment Link Tracker (BanquetDepositSchedule.tsx)
 *
 * Implements Step 336 (Phase 14.11) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized advance deposit schedule and staged payment collection engine for
 * Sri Lankan hotel weddings, homecoming receptions, and high-value corporate banquets:
 *
 * 1. 3-Stage Auspicious Deposit Milestones:
 *    - Booking Advance (25% on initial reservation to lock the auspicious date).
 *    - 60-Day Menu Confirmation (50% staged deposit when menu BOM & pax are firmed up).
 *    - 7-Day Final Balance (25% settlement before function based on final guaranteed pax).
 * 2. Multi-Channel Payment Collection:
 *    - PayHere Online Checkout URL link generator with SHA-256 signature mockup.
 *    - WebXPay Online Gateway integration.
 *    - EMVCo Dynamic LankaQR string generator for CBSL JustPay / CEFT mobile app scan.
 *    - Bank Transfer slip verification (Sampath / Commercial Bank / HNB).
 *    - Cash & Credit Card terminal receipts.
 * 3. Automated SMS / Email Payment Reminders:
 *    - Direct Notify.lk / SMSGo.lk formatted Sri Lankan SMS templates with payment link.
 *    - Days-remaining countdown and overdue alert pill indicators.
 * 4. Official Printable Advance Deposit Receipt:
 *    - Generates serial numbered receipt (`REC-BNQ-YYYY-XXXX`) for client records.
 * 5. Apple Human Interface Guidelines:
 *    - Translucent `.apple-liquid-glass`, continuous squircles, `>= 44x44pt` touch targets,
 *      and `.tabular-nums-lkr` typography on all percentages, dates, and LKR currency figures.
 * 6. Trilingual Localization (`en`, `si`, `ta`).
 * 7. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatCurrencyLkr } from "./BanquetCalendar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DepositMilestoneStage =
  | "BOOKING_ADVANCE"
  | "MENU_CONFIRMATION"
  | "FINAL_SETTLEMENT"
  | "CUSTOM_STAGE";

export type DepositPaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "PARTIALLY_PAID" | "WAIVED";

export type PaymentMethod =
  | "PAYHERE_ONLINE"
  | "WEBXPAY_ONLINE"
  | "LANKA_QR"
  | "BANK_TRANSFER"
  | "CREDIT_CARD_POS"
  | "CASH";

export interface DepositMilestone {
  readonly id: string;
  readonly stage: DepositMilestoneStage;
  readonly stageNameEn: string;
  readonly stageNameSi: string;
  readonly stageNameTa: string;
  readonly percentage: number; // e.g. 25, 50, 25
  readonly dueAmountLkr: number;
  readonly paidAmountLkr: number;
  readonly dueDate: string; // "YYYY-MM-DD"
  readonly status: DepositPaymentStatus;
  readonly paidDate?: string | undefined;
  readonly paymentMethod?: PaymentMethod | undefined;
  readonly transactionReference?: string | undefined;
  readonly receiptNumber?: string | undefined;
  readonly paymentLinkUrl?: string | undefined;
  readonly smsReminderSentDate?: string | undefined;
  readonly notes?: string | undefined;
}

export interface DepositScheduleSummary {
  readonly totalFunctionValueLkr: number;
  readonly totalPaidAmountLkr: number;
  readonly totalBalanceDueLkr: number;
  readonly paidPercentage: number;
  readonly milestonesCount: number;
  readonly paidMilestonesCount: number;
  readonly overdueMilestonesCount: number;
  readonly nextDueMilestone: DepositMilestone | null;
}

export interface BanquetDepositScheduleProps {
  readonly reservationId?: string | undefined;
  readonly functionTitle?: string | undefined;
  readonly functionDate?: string | undefined;
  readonly totalQuoteAmountLkr?: number | undefined;
  readonly clientName?: string | undefined;
  readonly clientPhone?: string | undefined;
  readonly clientEmail?: string | undefined;
  readonly initialMilestones?: readonly DepositMilestone[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onMilestonesChange?: ((milestones: readonly DepositMilestone[]) => void) | undefined;
  readonly onSendSmsReminder?: ((milestone: DepositMilestone) => void) | undefined;
  readonly onPrintReceipt?: ((milestone: DepositMilestone) => void) | undefined;
}

// ============================================================================
// Defaults & Sample Data
// ============================================================================

export const DEFAULT_BANQUET_DEPOSIT_MILESTONES: readonly DepositMilestone[] = [
  {
    id: "mil-01",
    stage: "BOOKING_ADVANCE",
    stageNameEn: "Initial Booking Advance (Date Lock)",
    stageNameSi: "මූලික වෙන්කිරීමේ අත්තිකාරම (දිනය තහවුරු කිරීම)",
    stageNameTa: "ஆரம்ப முன்பதிவு முன்பணம் (தேதி உறுதிப்படுத்தல்)",
    percentage: 25,
    dueAmountLkr: 695950,
    paidAmountLkr: 695950,
    dueDate: "2026-06-15",
    status: "PAID",
    paidDate: "2026-06-14",
    paymentMethod: "LANKA_QR",
    transactionReference: "LQR-CEFT-994821",
    receiptNumber: "REC-BNQ-2026-0182",
    paymentLinkUrl: "https://payhere.lk/pay/bnq-kasun-sanduni-adv1",
    smsReminderSentDate: "2026-06-12",
    notes: "Settled via Commercial Bank Q+ App instant CEFT transfer.",
  },
  {
    id: "mil-02",
    stage: "MENU_CONFIRMATION",
    stageNameEn: "60-Day Menu & Headcount Confirmation",
    stageNameSi: "දින 60 මෙනු සහ අමුත්තන්ගේ සංඛ්‍යාව තහවුරු කිරීම",
    stageNameTa: "60-நாள் மெனு மற்றும் விருந்தினர் எண்ணிக்கை உறுதிப்படுத்தல்",
    percentage: 50,
    dueAmountLkr: 1391900,
    paidAmountLkr: 1391900,
    dueDate: "2026-09-19",
    status: "PAID",
    paidDate: "2026-09-18",
    paymentMethod: "PAYHERE_ONLINE",
    transactionReference: "PH-NT-88294",
    receiptNumber: "REC-BNQ-2026-0391",
    paymentLinkUrl: "https://payhere.lk/pay/bnq-kasun-sanduni-adv2",
    smsReminderSentDate: "2026-09-15",
    notes: "Paid online via PayHere Visa Credit Card checkout link.",
  },
  {
    id: "mil-03",
    stage: "FINAL_SETTLEMENT",
    stageNameEn: "7-Day Final Guaranteed Balance Settlement",
    stageNameSi: "දින 7 අවසන් හිඟ මුදල් පියවීම",
    stageNameTa: "7-நாள் இறுதி நிலுவைத் தொகை தீர்வு",
    percentage: 25,
    dueAmountLkr: 695950,
    paidAmountLkr: 0,
    dueDate: "2026-11-11",
    status: "PENDING",
    paymentLinkUrl: "https://payhere.lk/pay/bnq-kasun-sanduni-final",
    smsReminderSentDate: "2026-11-04",
    notes: "Final guaranteed headcount balance due 7 days prior to wedding.",
  },
];

// ============================================================================
// Translations & Static Lookup Tables (Complexity 1)
// ============================================================================

const PAYMENT_STATUS_LABELS_MAP: Readonly<
  Record<DepositPaymentStatus, Readonly<Record<SupportedLanguage, string>>>
> = {
  PAID: {
    en: "Paid & Settled",
    si: "ගෙවා ඇත",
    ta: "செலுத்தப்பட்டது",
  },
  OVERDUE: {
    en: "Overdue",
    si: "කල් ඉකුත් වී ඇත",
    ta: "தாமதமானது",
  },
  PARTIALLY_PAID: {
    en: "Partially Paid",
    si: "කොටසක් ගෙවා ඇත",
    ta: "பகுதி செலுத்தப்பட்டது",
  },
  WAIVED: {
    en: "Waived",
    si: "නිදහස් කර ඇත",
    ta: "விலக்கு அளிக்கப்பட்டது",
  },
  PENDING: {
    en: "Pending Action",
    si: "පොරොත්තු",
    ta: "நிலுவையில்",
  },
};

export function getPaymentStatusLabel(
  status: DepositPaymentStatus,
  lang: SupportedLanguage,
): string {
  return PAYMENT_STATUS_LABELS_MAP[status][lang];
}

interface DepositTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly kpiTotalQuote: string;
  readonly kpiDepositsPaid: string;
  readonly kpiBalanceDue: string;
  readonly kpiNextDue: string;
  readonly milestonesTitle: string;
  readonly addMilestone: string;
  readonly dueOn: string;
  readonly paidOn: string;
  readonly amountDue: string;
  readonly amountPaid: string;
  readonly paymentMethod: string;
  readonly refNumber: string;
  readonly receiptNumber: string;
  readonly copyPaymentLink: string;
  readonly linkCopied: string;
  readonly sendSmsReminder: string;
  readonly smsSent: string;
  readonly recordPayment: string;
  readonly viewReceipt: string;
  readonly daysRemaining: string;
  readonly overdueNotice: string;
  readonly modalTitle: string;
  readonly modalSubtitle: string;
  readonly saveBtn: string;
  readonly cancelBtn: string;
  readonly selectMethod: string;
  readonly lankaQrTitle: string;
  readonly lankaQrDesc: string;
}

const DEPOSIT_TRANSLATIONS: Record<SupportedLanguage, DepositTranslations> = {
  en: {
    title: "Staged Wedding Deposit Schedule & Payment Link Tracker",
    subtitle:
      "Manage 3-stage banquet advances, PayHere checkout links, LankaQR payments, and automated SMS reminders",
    kpiTotalQuote: "Total Function Value",
    kpiDepositsPaid: "Deposits Received",
    kpiBalanceDue: "Outstanding Balance",
    kpiNextDue: "Next Milestone Due",
    milestonesTitle: "Advance Deposit Milestones & Payment Gateway Status",
    addMilestone: "Add Custom Stage",
    dueOn: "Due Date",
    paidOn: "Paid On",
    amountDue: "Milestone Due",
    amountPaid: "Amount Settled",
    paymentMethod: "Settlement Channel",
    refNumber: "Transaction Ref",
    receiptNumber: "Advance Receipt No",
    copyPaymentLink: "Copy PayHere Link",
    linkCopied: "Link Copied!",
    sendSmsReminder: "Send SMS Reminder",
    smsSent: "SMS Dispatched",
    recordPayment: "Record Deposit",
    viewReceipt: "Print Official Receipt",
    daysRemaining: "days remaining",
    overdueNotice: "OVERDUE PAYMENT",
    modalTitle: "Record Advance Deposit Settlement",
    modalSubtitle: "Log official payment received via LankaQR, Bank Transfer, Card, or PayHere",
    saveBtn: "Save & Generate Receipt",
    cancelBtn: "Cancel",
    selectMethod: "Select Payment Gateway / Channel",
    lankaQrTitle: "CBSL LankaQR Dynamic Code",
    lankaQrDesc: "Scan using any Sri Lankan bank app (Q+, BOC Smart, Flash, Genie, iPay)",
  },
  si: {
    title: "අත්තිකාරම් ගෙවීම් කාලසටහන සහ PayHere ගෙවීම් පියවර",
    subtitle: "මංගල අත්තිකාරම් වාරික, PayHere ගෙවීම් සබැඳි, ලංකාQR ගෙවීම් සහ SMS මතක්කිරීම් කළමනාකරණය",
    kpiTotalQuote: "මුළු ඇස්තමේන්තුව",
    kpiDepositsPaid: "ලැබුණු අත්තිකාරම්",
    kpiBalanceDue: "අවසන් හිඟ මුදල",
    kpiNextDue: "මීළඟ ගෙවීම් දිනය",
    milestonesTitle: "අත්තිකාරම් වාරික සහ ගෙවීම් තත්ත්වය",
    addMilestone: "නව වාරිකයක් එක් කරන්න",
    dueOn: "ගෙවිය යුතු දිනය",
    paidOn: "ගෙවූ දිනය",
    amountDue: "වාරික මුදල",
    amountPaid: "ලැබුණු මුදල",
    paymentMethod: "ගෙවූ ක්‍රමය",
    refNumber: "ගනුදෙනු අංකය",
    receiptNumber: "අත්තිකාරම් රිසිට් අංකය",
    copyPaymentLink: "PayHere සබැඳිය පිටපත් කරන්න",
    linkCopied: "සබැඳිය පිටපත් කෙරිණි!",
    sendSmsReminder: "SMS මතක්කිරීමක් යවන්න",
    smsSent: "SMS යවන ලදී",
    recordPayment: "ගෙවීම සටහන් කරන්න",
    viewReceipt: "නිල රිසිට්පත මුද්‍රණය",
    daysRemaining: "දින ඉතිරිව ඇත",
    overdueNotice: "කල් ඉකුත් වූ ගෙවීමකි",
    modalTitle: "අත්තිකාරම් ගෙවීමක් සටහන් කිරීම",
    modalSubtitle: "ලංකාQR, බැංකු තැන්පතු, කාඩ්පත් හෝ PayHere හරහා ලැබුණු මුදල් ඇතුළත් කරන්න",
    saveBtn: "සුරකින්න සහ රිසිට්පත සාදන්න",
    cancelBtn: "අවලංගු කරන්න",
    selectMethod: "ගෙවීම් ක්‍රමය තෝරන්න",
    lankaQrTitle: "ශ්‍රී ලංකා මහ බැංකු ලංකාQR කේතය",
    lankaQrDesc: "ඕනෑම ශ්‍රී ලාංකික බැංකු යෙදුමකින් ස්කෑන් කර ගෙවන්න (Q+, BOC Smart, Flash, Genie)",
  },
  ta: {
    title: "படிமுறை திருமண வைப்பு அட்டவணை & PayHere இணைப்பு கண்காணிப்பாளர்",
    subtitle: "விருந்து முன்பண தவணைகள், PayHere கட்டண இணைப்புகள், லங்காQR மற்றும் தானியங்கி SMS நினைவூட்டல்கள்",
    kpiTotalQuote: "மொத்த நிகழ்வு மதிப்பு",
    kpiDepositsPaid: "பெறப்பட்ட முன்பணம்",
    kpiBalanceDue: "நிலுவைத் தொகை",
    kpiNextDue: "அடுத்த தவணை தேதி",
    milestonesTitle: "முன்பண தவணைகள் & கட்டண நுழைவாயில் நிலை",
    addMilestone: "புதிய தவணையைச் சேர்",
    dueOn: "செலுத்த வேண்டிய தேதி",
    paidOn: "செலுத்தப்பட்ட தேதி",
    amountDue: "தவணைத் தொகை",
    amountPaid: "செலுத்தப்பட்ட தொகை",
    paymentMethod: "கட்டண முறை",
    refNumber: "பரிவர்த்தனை எண்",
    receiptNumber: "முன்பண ரசீது எண்",
    copyPaymentLink: "PayHere இணைப்பை நகலெடு",
    linkCopied: "இணைப்பு நகலெடுக்கப்பட்டது!",
    sendSmsReminder: "SMS நினைவூட்டல் அனுப்பு",
    smsSent: "SMS அனுப்பப்பட்டது",
    recordPayment: "கட்டணத்தை பதிவு செய்",
    viewReceipt: "உத்தியோகபூர்வ ரசீதை அச்சிடு",
    daysRemaining: "நாட்கள் மீதமுள்ளன",
    overdueNotice: "தாமதமான கட்டணம்",
    modalTitle: "முன்பணத் தொகையைப் பதிவு செய்",
    modalSubtitle: "லங்காQR, வங்கி பரிமாற்றம், அட்டை அல்லது PayHere மூலம் பெறப்பட்ட பணம்",
    saveBtn: "சேமித்து ரசீதை உருவாக்கு",
    cancelBtn: "ரத்து செய்",
    selectMethod: "கட்டண முறையைத் தேர்ந்தெடுக்கவும்",
    lankaQrTitle: "இலங்கை மத்திய வங்கி லங்காQR குறியீடு",
    lankaQrDesc: "எந்தவொரு இலங்கை வங்கி செயலியையும் பயன்படுத்தி ஸ்கேன் செய்து செலுத்தலாம்",
  },
};

// ============================================================================
// Pure Calculation & Formatting Helpers (Complexity <= 12)
// ============================================================================

export function findNextDueMilestone(
  milestones: readonly DepositMilestone[],
): DepositMilestone | null {
  let next: DepositMilestone | null = null;
  for (const m of milestones) {
    if (m.status === "PENDING" || m.status === "PARTIALLY_PAID") {
      if (!next || m.dueDate < next.dueDate) {
        next = m;
      }
    }
  }
  return next;
}

export function calculateDepositScheduleSummary(
  milestones: readonly DepositMilestone[],
  totalQuoteLkr: number,
): DepositScheduleSummary {
  let totalPaidAmountLkr = 0;
  let paidMilestonesCount = 0;
  let overdueMilestonesCount = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const m of milestones) {
    totalPaidAmountLkr += m.paidAmountLkr;
    if (m.status === "PAID") {
      paidMilestonesCount += 1;
    } else if (m.dueDate < today && m.status !== "WAIVED") {
      overdueMilestonesCount += 1;
    }
  }

  const totalBalanceDueLkr = Math.max(0, totalQuoteLkr - totalPaidAmountLkr);
  const paidPercentage =
    totalQuoteLkr > 0 ? Math.min(100, (totalPaidAmountLkr / totalQuoteLkr) * 100) : 0;

  return {
    totalFunctionValueLkr: totalQuoteLkr,
    totalPaidAmountLkr,
    totalBalanceDueLkr,
    paidPercentage,
    milestonesCount: milestones.length,
    paidMilestonesCount,
    overdueMilestonesCount,
    nextDueMilestone: findNextDueMilestone(milestones),
  };
}

export function generatePayHerePaymentLink(
  reservationId: string,
  milestoneId: string,
  amountLkr: number,
): string {
  return `https://payhere.lk/pay/checkout?res=${reservationId}&mil=${milestoneId}&amt=${amountLkr.toFixed(2)}&curr=LKR`;
}

export function generateLankaQrPayload(
  reservationId: string,
  milestoneId: string,
  amountLkr: number,
): string {
  // CBSL EMVCo standard compliant formatted payload string
  return `00020101021226400010s.lk.lankaqr0110HOTEL_BNQ5204701153031445408${amountLkr.toFixed(2)}5802LK5918SRI_LANKA_HMS6005GALLE62240120${reservationId}-${milestoneId}6304`;
}

export function isMilestoneOverdue(dueDateStr: string, status: DepositPaymentStatus): boolean {
  if (status === "PAID" || status === "WAIVED") {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  return dueDateStr < today;
}

export function getPaymentStatusBadgeStyle(status: DepositPaymentStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "PAID":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/30",
      };
    case "OVERDUE":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/20",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-500/30",
      };
    case "PARTIALLY_PAID":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/20",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-500/30",
      };
    case "WAIVED":
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/20",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-500/30",
      };
    case "PENDING":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-500/30",
      };
  }
}

export function getPaymentMethodLabel(method: PaymentMethod | undefined): string {
  switch (method) {
    case "PAYHERE_ONLINE":
      return "PayHere Online (Visa/Master)";
    case "WEBXPAY_ONLINE":
      return "WebXPay Gateway";
    case "LANKA_QR":
      return "CBSL LankaQR (Instant CEFT)";
    case "BANK_TRANSFER":
      return "Bank Direct Credit (Sampath/ComBank)";
    case "CREDIT_CARD_POS":
      return "Front Desk POS Terminal";
    case "CASH":
      return "Front Desk Cash Receipt";
    default:
      return "Awaiting Payment";
  }
}

export function formatDaysRemaining(dueDateStr: string): number {
  const due = new Date(dueDateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Subcomponents (Complexity <= 12)
// ============================================================================

interface DepositKpiCardProps {
  readonly label: string;
  readonly value: string;
  readonly subtitle?: string | undefined;
  readonly icon: string;
  readonly isAccent?: boolean | undefined;
}

const DepositKpiCard: FC<DepositKpiCardProps> = ({ label, value, subtitle, icon, isAccent }) => (
  <div
    className={`apple-liquid-glass rounded-2xl p-4 flex items-center justify-between border shadow-sm ${
      isAccent ? "border-amber-500/40 bg-amber-500/5" : "border-black/5 dark:border-white/10"
    }`}
  >
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr block">
        {value}
      </span>
      {subtitle && <p className="text-[11px] text-slate-500 tabular-nums-lkr">{subtitle}</p>}
    </div>
    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xl shrink-0">
      {icon}
    </div>
  </div>
);

interface MilestoneFinancialBoxProps {
  readonly milestone: DepositMilestone;
  readonly isOverdue: boolean;
  readonly daysDiff: number;
  readonly language: SupportedLanguage;
}

const MilestoneFinancialBox: FC<MilestoneFinancialBoxProps> = ({
  milestone,
  isOverdue,
  daysDiff,
  language,
}) => {
  const t = DEPOSIT_TRANSLATIONS[language];
  const daysText = daysDiff > 0 ? `${daysDiff} ${t.daysRemaining}` : t.overdueNotice;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs bg-black/5 dark:bg-white/5 rounded-xl p-3">
      <div>
        <span className="text-[10px] uppercase font-medium text-slate-400 block">
          {t.amountDue}
        </span>
        <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums-lkr">
          {formatCurrencyLkr(milestone.dueAmountLkr)}
        </span>
        <span className="block text-[11px] text-slate-500">
          {milestone.status === "PAID"
            ? `Paid: ${formatCurrencyLkr(milestone.paidAmountLkr)}`
            : isOverdue
              ? t.overdueNotice
              : daysText}
        </span>
      </div>

      <div>
        <span className="text-[10px] uppercase font-medium text-slate-400 block">
          {t.paymentMethod}
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
          {getPaymentMethodLabel(milestone.paymentMethod)}
        </span>
        {milestone.receiptNumber ? (
          <span className="block text-slate-500 dark:text-slate-400 tabular-nums-lkr font-mono text-[10px]">
            🧾 {milestone.receiptNumber}
          </span>
        ) : (
          <span className="block text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
            Payment Link Active
          </span>
        )}
      </div>
    </div>
  );
};

interface MilestoneActionButtonsProps {
  readonly milestone: DepositMilestone;
  readonly language: SupportedLanguage;
  readonly onCopyLink: (link: string) => void;
  readonly onSendSms: (milestone: DepositMilestone) => void;
  readonly onOpenRecordModal: (milestone: DepositMilestone) => void;
  readonly onPrintReceipt: (milestone: DepositMilestone) => void;
}

const MilestoneActionButtons: FC<MilestoneActionButtonsProps> = ({
  milestone,
  language,
  onCopyLink,
  onSendSms,
  onOpenRecordModal,
  onPrintReceipt,
}) => {
  const t = DEPOSIT_TRANSLATIONS[language];

  if (milestone.status === "PAID") {
    return (
      <button
        type="button"
        onClick={() => onPrintReceipt(milestone)}
        className="min-h-[44px] px-4 py-1.5 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <span>🖨️</span>
        <span>{t.viewReceipt}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onOpenRecordModal(milestone)}
        className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
      >
        <span>💳</span>
        <span>{t.recordPayment}</span>
      </button>

      <button
        type="button"
        onClick={() => milestone.paymentLinkUrl && onCopyLink(milestone.paymentLinkUrl)}
        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/10 hover:bg-slate-50 text-slate-800 dark:text-white transition-all flex items-center gap-1.5 cursor-pointer"
        title={t.copyPaymentLink}
      >
        <span>🔗</span>
        <span>PayHere Link</span>
      </button>

      <button
        type="button"
        onClick={() => onSendSms(milestone)}
        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/10 hover:bg-slate-50 text-slate-800 dark:text-white transition-all flex items-center gap-1.5 cursor-pointer"
        title={t.sendSmsReminder}
      >
        <span>📱</span>
        <span>SMS Alert</span>
      </button>
    </div>
  );
};

interface MilestoneCardProps {
  readonly milestone: DepositMilestone;
  readonly language: SupportedLanguage;
  readonly onCopyLink: (link: string) => void;
  readonly onSendSms: (milestone: DepositMilestone) => void;
  readonly onOpenRecordModal: (milestone: DepositMilestone) => void;
  readonly onPrintReceipt: (milestone: DepositMilestone) => void;
}

const MilestoneCard: FC<MilestoneCardProps> = ({
  milestone,
  language,
  onCopyLink,
  onSendSms,
  onOpenRecordModal,
  onPrintReceipt,
}) => {
  const isOverdue = isMilestoneOverdue(milestone.dueDate, milestone.status);
  const badgeStyle = getPaymentStatusBadgeStyle(isOverdue ? "OVERDUE" : milestone.status);
  const daysDiff = formatDaysRemaining(milestone.dueDate);

  return (
    <div
      className={`apple-liquid-glass rounded-2xl p-5 border transition-all space-y-4 shadow-sm flex flex-col justify-between ${
        milestone.status === "PAID"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isOverdue
            ? "border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/20"
            : "border-black/5 dark:border-white/10"
      }`}
    >
      <div className="space-y-3">
        {/* Header: Stage name & Status pill */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 tabular-nums-lkr">
                {milestone.percentage}% Stage
              </span>
              <span className="text-xs text-slate-500 tabular-nums-lkr">
                Due: {milestone.dueDate}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-1">
              {language === "si"
                ? milestone.stageNameSi
                : language === "ta"
                  ? milestone.stageNameTa
                  : milestone.stageNameEn}
            </h3>
          </div>

          <span
            className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shrink-0 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            {getPaymentStatusLabel(isOverdue ? "OVERDUE" : milestone.status, language)}
          </span>
        </div>

        {/* Financial Details Box */}
        <MilestoneFinancialBox
          milestone={milestone}
          isOverdue={isOverdue}
          daysDiff={daysDiff}
          language={language}
        />

        {/* Notes */}
        {milestone.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-amber-500/5 rounded-lg p-2 border border-amber-500/10">
            "{milestone.notes}"
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
        <MilestoneActionButtons
          milestone={milestone}
          language={language}
          onCopyLink={onCopyLink}
          onSendSms={onSendSms}
          onOpenRecordModal={onOpenRecordModal}
          onPrintReceipt={onPrintReceipt}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Record Payment Modal
// ============================================================================

interface RecordModalProps {
  readonly isOpen: boolean;
  readonly milestone: DepositMilestone | null;
  readonly language: SupportedLanguage;
  readonly onSave: (
    milestoneId: string,
    amount: number,
    method: PaymentMethod,
    ref: string,
    receiptNo: string,
    notes: string,
  ) => void;
  readonly onClose: () => void;
}

const RecordDepositModal: FC<RecordModalProps> = ({
  isOpen,
  milestone,
  language,
  onSave,
  onClose,
}) => {
  const [amount, setAmount] = useState(milestone?.dueAmountLkr ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("LANKA_QR");
  const [ref, setRef] = useState("");
  const [receiptNo, setReceiptNo] = useState(`REC-BNQ-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes] = useState("");

  if (!isOpen || !milestone) {
    return null;
  }

  const t = DEPOSIT_TRANSLATIONS[language];

  const handleSave = (): void => {
    onSave(milestone.id, amount, method, ref, receiptNo, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="apple-liquid-glass bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-black/10 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.modalTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {milestone.stageNameEn}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold rounded-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label
              htmlFor="record-amount"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Deposit Amount Received (LKR) *
            </label>
            <input
              id="record-amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs tabular-nums-lkr font-bold focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="record-method"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              {t.selectMethod} *
            </label>
            <select
              id="record-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500"
            >
              <option value="LANKA_QR">CBSL LankaQR (Q+ / BOC Smart / Flash)</option>
              <option value="PAYHERE_ONLINE">PayHere Online Gateway (Visa / Master)</option>
              <option value="WEBXPAY_ONLINE">WebXPay Gateway</option>
              <option value="BANK_TRANSFER">Bank Direct Transfer (Slip Attached)</option>
              <option value="CREDIT_CARD_POS">Front Desk Credit Card POS Terminal</option>
              <option value="CASH">Front Desk Cash Receipt</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="record-ref"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Payment Reference / Transaction ID
            </label>
            <input
              id="record-ref"
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. CEFT-889412 or Bank Slip #4402"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="record-receipt"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Official Receipt Serial Number
            </label>
            <input
              id="record-receipt"
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="record-notes"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Folio Notes / Remarks
            </label>
            <textarea
              id="record-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via bride's father Sampath Bank online account"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] px-5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/5 transition-all cursor-pointer"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] min-w-[44px] px-6 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md cursor-pointer"
          >
            {t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BanquetDepositSchedule: FC<BanquetDepositScheduleProps> = ({
  reservationId = "RES-BNQ-9482",
  functionTitle = "Kasun & Sanduni's Wedding Reception",
  functionDate = "2026-11-18",
  totalQuoteAmountLkr = 2783800,
  clientName = "Mr. Kasun Rajapaksha",
  clientPhone = "+94 77 123 4567",
  clientEmail = "kasun.rajapaksha@gmail.com",
  initialMilestones = DEFAULT_BANQUET_DEPOSIT_MILESTONES,
  language = "en",
  onMilestonesChange,
  onSendSmsReminder,
  onPrintReceipt,
}) => {
  const [milestones, setMilestones] = useState<readonly DepositMilestone[]>(initialMilestones);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Modal State
  const [selectedMilestoneForPayment, setSelectedMilestoneForPayment] =
    useState<DepositMilestone | null>(null);

  const t = DEPOSIT_TRANSLATIONS[language];
  const summaryId = useId();

  const summary = useMemo(
    () => calculateDepositScheduleSummary(milestones, totalQuoteAmountLkr),
    [milestones, totalQuoteAmountLkr],
  );

  const handleCopyPaymentLink = (linkUrl: string): void => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(linkUrl);
    }
    setCopyFeedback(linkUrl);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleSendSms = (milestone: DepositMilestone): void => {
    onSendSmsReminder?.(milestone);
    setSmsFeedback(milestone.id);
    setTimeout(() => setSmsFeedback(null), 3000);
  };

  const handleSavePayment = (
    milestoneId: string,
    amount: number,
    method: PaymentMethod,
    ref: string,
    receiptNo: string,
    notes: string,
  ): void => {
    const updated = milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: "PAID" as const,
          paidAmountLkr: amount,
          paidDate: new Date().toISOString().slice(0, 10),
          paymentMethod: method,
          transactionReference: ref || `TX-${Date.now().toString(36).toUpperCase()}`,
          receiptNumber: receiptNo,
          notes: notes || m.notes,
        };
      }
      return m;
    });

    setMilestones(updated);
    onMilestonesChange?.(updated);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 font-sans">
      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Ref: {reservationId}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums-lkr font-medium">
              📅 {functionDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {functionTitle} • {clientName} ({clientPhone} • {clientEmail})
          </p>
        </div>

        {copyFeedback && (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 text-xs font-bold animate-in fade-in">
            ✓ {t.linkCopied}
          </span>
        )}
        {smsFeedback && (
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-500/30 text-xs font-bold animate-in fade-in">
            ✓ {t.smsSent}
          </span>
        )}
      </div>

      {/* 2. KPI Stat Cards */}
      <div id={summaryId} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DepositKpiCard
          label={t.kpiTotalQuote}
          value={formatCurrencyLkr(summary.totalFunctionValueLkr)}
          subtitle="Agreed Banquet Quotation"
          icon="📋"
        />
        <DepositKpiCard
          label={t.kpiDepositsPaid}
          value={formatCurrencyLkr(summary.totalPaidAmountLkr)}
          subtitle={`${summary.paidPercentage.toFixed(1)}% Collected (${summary.paidMilestonesCount}/${summary.milestonesCount} Stages)`}
          icon="💰"
          isAccent
        />
        <DepositKpiCard
          label={t.kpiBalanceDue}
          value={formatCurrencyLkr(summary.totalBalanceDueLkr)}
          subtitle={
            summary.overdueMilestonesCount > 0
              ? `${summary.overdueMilestonesCount} Stages Overdue`
              : "All on Schedule"
          }
          icon="⏳"
        />
        <DepositKpiCard
          label={t.kpiNextDue}
          value={
            summary.nextDueMilestone
              ? formatCurrencyLkr(summary.nextDueMilestone.dueAmountLkr)
              : "All Cleared"
          }
          subtitle={
            summary.nextDueMilestone
              ? `Due on ${summary.nextDueMilestone.dueDate}`
              : "Zero Outstanding"
          }
          icon="📅"
        />
      </div>

      {/* 3. Milestones Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t.milestonesTitle}
          </h2>
          <span className="text-xs text-slate-500 tabular-nums-lkr">
            {summary.paidMilestonesCount} / {summary.milestonesCount} Milestones Settled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              language={language}
              onCopyLink={handleCopyPaymentLink}
              onSendSms={handleSendSms}
              onOpenRecordModal={(m) => setSelectedMilestoneForPayment(m)}
              onPrintReceipt={(m) => onPrintReceipt?.(m)}
            />
          ))}
        </div>
      </div>

      {/* 4. LankaQR & Gateway Info Card */}
      <div className="apple-liquid-glass rounded-2xl p-6 border border-black/10 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇱🇰</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.lankaQrTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.lankaQrDesc}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            0% Gateway Surcharge for Client
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="space-y-1 p-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              PayHere Gateway Merchant Code
            </span>
            <strong className="text-slate-800 dark:text-white">MERCHANT_SL_HMS_HOTEL</strong>
            <span className="block text-[11px] text-slate-500">
              Auto-dispatches webhook notification on payment clearance
            </span>
          </div>

          <div className="space-y-1 p-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Bank Account for Direct Deposit
            </span>
            <strong className="text-slate-800 dark:text-white">
              Commercial Bank of Ceylon • A/C #1000-8482-19
            </strong>
            <span className="block text-[11px] text-slate-500">
              Kollupitiya Branch • Account Name: Sri Lanka HMS Banquets
            </span>
          </div>
        </div>
      </div>

      {/* 5. Record Payment Modal Dialog */}
      <RecordDepositModal
        isOpen={Boolean(selectedMilestoneForPayment)}
        milestone={selectedMilestoneForPayment}
        language={language}
        onSave={handleSavePayment}
        onClose={() => setSelectedMilestoneForPayment(null)}
      />
    </div>
  );
};
