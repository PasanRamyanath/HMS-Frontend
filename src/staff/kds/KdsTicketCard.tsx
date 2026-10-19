/**
 * KDS Order Ticket Card with SLA Color Escalation & Spice/Allergen Highlights (KdsTicketCard.tsx)
 * Purpose-built for Sri Lankan hotel kitchens, resort beachfront cook lines, and room service runner stations.
 *
 * Apple Human Interface Guidelines Standards:
 * - SLA Escalation: >15 min Amber (#F59E0B) warning border, >25 min pulsing Red (#EF4444) overdue alert
 * - OLED vibrancy card with continuous squircle radii and high contrast
 * - Sinhala & Tamil localized dish subtitle labels
 * - Spice level ratings with visual chili badges (🌶️)
 * - Allergen & dietary badges (HALAL, DAIRY_FREE, VEGAN, GLUTEN_FREE, NUT_FREE)
 * - Guest allergy/note callout banner with high-contrast alert
 * - Accessible individual line item check-off with strike-through styling
 * - 1-Tap status progression: Start Cooking -> Mark Ready -> Mark Delivered
 * - Recall / Undo button for kitchen flow corrections
 * - Thermal slip print button for 80mm kitchen receipt printers
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import type { FC } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
  type KdsOrderItem,
  type KdsOrderStatus,
  type KdsOrderType,
  type KdsSlaUrgency,
  type KdsTicket,
  formatElapsedTimer,
  getAdvanceButtonText,
  getOrderTypeDetails,
} from "./KdsKanbanView.js";

// ============================================================================
// Types
// ============================================================================

export interface KdsTicketCardProps {
  readonly ticket: KdsTicket;
  readonly language?: SupportedLanguage | undefined;
  readonly readOnly?: boolean | undefined;
  readonly onAdvance?: ((orderId: string) => void) | undefined;
  readonly onRecall?: ((orderId: string) => void) | undefined;
  readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
  readonly onPrint?: ((ticket: KdsTicket) => void) | undefined;
}

// ============================================================================
// Sri Lankan Common Resort Menu Subtitle Translations
// ============================================================================

const DISH_SUBTITLES: Record<string, Record<SupportedLanguage, string>> = {
  "Jaffna Lagoon Crab Curry": {
    en: "Lagoon Crab in Spicy Jaffna Roast Curry",
    si: "යාපනය කලපු කකුළු කරිය",
    ta: "யாழ்ப்பாண களப்பு நண்டு கறி",
  },
  "Ceylon Pol Roti with Lunumiris": {
    en: "Traditional Coconut Flatbread with Chilli Sambol",
    si: "පොල් රොටී ලුණුමිරිස් සමග",
    ta: "தேங்காய் ரொட்டி மிளகாய் சம்பல்",
  },
  "Mixed Seafood Kottu Roti": {
    en: "Griddled Chopped Roti with Calamari, Prawns & Fish",
    si: "මුහුදු ආහාර කොත්තු රොටී",
    ta: "சீஃபுட் கொத்து ரொட்டி",
  },
  "Egg Hopper Set (3 Hoppers + 1 Egg)": {
    en: "Crispy Fermented Rice-Batter Bowls with Farm Egg",
    si: "බිත්තර ආප්ප සෙට් එක (ආප්ප 3 + බිත්තර 1)",
    ta: "முட்டை ஆப்பம் செட்",
  },
  "Devilled Chicken with Capsicums": {
    en: "Wok-Tossed Spicy Chicken with Banana Peppers",
    si: "ඩෙවිල් චිකන් කැප්සිකම් සමග",
    ta: "டெவில்ட் சிக்கன்",
  },
  "Ceylon Vegetable Egg Fried Rice": {
    en: "Basmati Rice Wok-Fried with Garden Vegetables",
    si: "එළවළු සහ බිත්තර ෆ්‍රයිඩ් රයිස්",
    ta: "முட்டை காய்கறி ஃப்ரைட் ரைஸ்",
  },
  "Chicken Biryani with Mint Sambol": {
    en: "Spiced Dum Biryani with Roast Cashews & Egg",
    si: "චිකන් බිරියානි මිංචි සම්බෝල සමග",
    ta: "சிக்கன் பிரியாணி புதினா சம்பல்",
  },
  "Mirissa King Coconut (Thambili)": {
    en: "Fresh Chilled Golden King Coconut",
    si: "මිරිස්ස නැවුම් තැඹිලි",
    ta: "மிரிஸ்ஸ செவ்விளநீர்",
  },
};

export function getDishSubtitle(dishName: string, language: SupportedLanguage): string | null {
  if (language === "en") {
    return DISH_SUBTITLES[dishName]?.en ?? null;
  }
  return DISH_SUBTITLES[dishName]?.[language] ?? null;
}

// ============================================================================
// SLA Urgency & Visual Escalation Calculations
// ============================================================================

export interface TicketSlaDetails {
  readonly urgency: KdsSlaUrgency;
  readonly isWarning: boolean;
  readonly isOverdue: boolean;
  readonly borderClass: string;
  readonly badgeBgClass: string;
  readonly badgeTextClass: string;
  readonly isPulsing: boolean;
}

export function evaluateTicketSlaUrgency(
  elapsedSeconds: number,
  targetMinutes = 20,
): TicketSlaDetails {
  const isOverdue =
    elapsedSeconds >= 25 * 60 || (targetMinutes > 0 && elapsedSeconds > targetMinutes * 60);
  const isWarning =
    !isOverdue &&
    (elapsedSeconds >= 15 * 60 ||
      (targetMinutes > 0 && elapsedSeconds >= targetMinutes * 60 * 0.7));

  if (isOverdue) {
    return {
      urgency: "OVERDUE",
      isWarning: false,
      isOverdue: true,
      borderClass: "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.35)]",
      badgeBgClass: "bg-red-500/20",
      badgeTextClass: "text-red-400 font-extrabold",
      isPulsing: true,
    };
  }

  if (isWarning) {
    return {
      urgency: "WARNING",
      isWarning: true,
      isOverdue: false,
      borderClass: "border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
      badgeBgClass: "bg-amber-500/20",
      badgeTextClass: "text-amber-400 font-bold",
      isPulsing: false,
    };
  }

  return {
    urgency: "NORMAL",
    isWarning: false,
    isOverdue: false,
    borderClass: "border-slate-800 dark:border-white/10",
    badgeBgClass: "bg-slate-800/80",
    badgeTextClass: "text-slate-300 font-medium",
    isPulsing: false,
  };
}

// ============================================================================
// Dietary & Allergen Badges
// ============================================================================

const DIETARY_BADGE_CLASSES: Record<string, string> = {
  HALAL: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  DAIRY_FREE: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  VEGAN: "bg-green-500/20 text-green-300 border-green-500/30",
  VEGETARIAN: "bg-lime-500/20 text-lime-300 border-lime-500/30",
  GLUTEN_FREE: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  CELIAC: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  NUT_FREE: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export function getDietaryBadgeClass(dietary: string): string {
  const normalized = dietary.trim().toUpperCase().replace(/[-\s]/g, "_");
  return DIETARY_BADGE_CLASSES[normalized] ?? "bg-slate-700/50 text-slate-300 border-slate-600/30";
}

// ============================================================================
// Subcomponents
// ============================================================================

interface TicketHeaderSectionProps {
  readonly ticketNumber: string;
  readonly orderType: KdsOrderType;
  readonly destination: string;
  readonly elapsedSeconds: number;
  readonly targetMinutes: number;
  readonly sla: TicketSlaDetails;
  readonly language: SupportedLanguage;
}

function TicketHeaderSection({
  ticketNumber,
  orderType,
  destination,
  elapsedSeconds,
  targetMinutes,
  sla,
  language,
}: TicketHeaderSectionProps) {
  const typeDetails = getOrderTypeDetails(orderType, language);

  return (
    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-white">{ticketNumber}</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeDetails.badgeClass}`}
          >
            <span aria-hidden="true">{typeDetails.icon}</span>
            <span>{typeDetails.label}</span>
          </span>
        </div>
        <p className="text-xs font-bold text-slate-300 mt-1">{destination}</p>
      </div>

      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 ${sla.badgeBgClass} ${
          sla.isPulsing ? "animate-pulse" : ""
        }`}
      >
        <span className="text-xs" aria-hidden="true">
          ⏱️
        </span>
        <span
          className={`text-sm font-mono tabular-nums-lkr tabular-nums ${sla.badgeTextClass}`}
          aria-label={`Elapsed time ${formatElapsedTimer(elapsedSeconds)}`}
        >
          {formatElapsedTimer(elapsedSeconds)}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">/{targetMinutes}m</span>
      </div>
    </div>
  );
}

interface ItemRowProps {
  readonly item: KdsOrderItem;
  readonly orderId: string;
  readonly language: SupportedLanguage;
  readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
}

function ItemRow({ item, orderId, language, onToggleItem }: ItemRowProps) {
  const isDone = !!item.isCompleted;
  const subtitle = getDishSubtitle(item.name, language);

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggleItem?.(orderId, item.id)}
        className={`w-full text-left p-2.5 rounded-xl transition-all border cursor-pointer ${
          isDone
            ? "bg-emerald-950/30 border-emerald-500/30 line-through opacity-60"
            : "bg-white/5 border-white/10 hover:bg-white/10"
        }`}
        aria-pressed={isDone}
        aria-label={`Toggle ${item.quantity}x ${item.name} completed`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="text-base font-black text-[#E8772E] tabular-nums-lkr tabular-nums min-w-[22px]">
              {item.quantity}x
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-snug">{item.name}</p>
              {subtitle && <p className="text-[11px] text-amber-200/90 font-medium">{subtitle}</p>}
              {item.portion && (
                <p className="text-[11px] text-slate-400 mt-0.5">Portion: {item.portion}</p>
              )}
              {item.spiceLevel && (
                <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 rounded mt-1">
                  {item.spiceLevel}
                </span>
              )}
              {item.dietary && item.dietary.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.dietary.map((d) => (
                    <span
                      key={d}
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${getDietaryBadgeClass(
                        d,
                      )}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                  {item.modifiers.map((m) => (
                    <p key={m}>+ {m}</p>
                  ))}
                </div>
              )}
              {item.specialInstructions && (
                <p className="text-[11px] text-red-300 font-semibold mt-1 italic">
                  Note: {item.specialInstructions}
                </p>
              )}
            </div>
          </div>

          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 border ${
              isDone
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "border-white/30 text-transparent"
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
        </div>
      </button>
    </li>
  );
}

interface ActionButtonsSectionProps {
  readonly ticketNumber: string;
  readonly orderId: string;
  readonly status: KdsOrderStatus;
  readonly advanceLabel: string;
  readonly canAdvance: boolean;
  readonly canRecall: boolean;
  readonly onAdvance?: ((orderId: string) => void) | undefined;
  readonly onRecall?: ((orderId: string) => void) | undefined;
}

function ActionButtonsSection({
  ticketNumber,
  orderId,
  status,
  advanceLabel,
  canAdvance,
  canRecall,
  onAdvance,
  onRecall,
}: ActionButtonsSectionProps) {
  return (
    <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
      {canRecall && (
        <button
          type="button"
          onClick={() => onRecall?.(orderId)}
          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="Undo / Move back to previous status"
          aria-label={`Recall ticket ${ticketNumber} to previous status`}
        >
          ↩️
        </button>
      )}

      {canAdvance && (
        <button
          type="button"
          onClick={() => onAdvance?.(orderId)}
          className={`flex-1 min-h-[48px] py-2.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-white/20 ${
            status === "COOKING"
              ? "bg-amber-600 hover:bg-amber-500"
              : status === "READY_TO_DELIVER"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-[#E8772E] hover:bg-[#d4651e]"
          }`}
          aria-label={`${advanceLabel} for ticket ${ticketNumber}`}
        >
          <span>{advanceLabel}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main Exported Component: KdsTicketCard
// ============================================================================

export const KdsTicketCard: FC<KdsTicketCardProps> = ({
  ticket,
  language = "en",
  readOnly = false,
  onAdvance,
  onRecall,
  onToggleItem,
  onPrint,
}) => {
  const sla = evaluateTicketSlaUrgency(ticket.elapsedSeconds, ticket.targetMinutes);
  const advanceLabel = getAdvanceButtonText(ticket.status, language);
  const canAdvance = ticket.status !== "COMPLETED" && !readOnly;
  const canRecall = ticket.status !== "NEW_ORDER" && !readOnly;

  return (
    <article
      data-testid={`kds-ticket-${ticket.orderId}`}
      className={`rounded-2xl p-4 transition-all duration-200 bg-slate-900/95 border ${sla.borderClass} text-white flex flex-col justify-between min-h-[320px] shadow-lg`}
    >
      <div>
        <TicketHeaderSection
          ticketNumber={ticket.ticketNumber}
          orderType={ticket.orderType}
          destination={ticket.destination}
          elapsedSeconds={ticket.elapsedSeconds}
          targetMinutes={ticket.targetMinutes}
          sla={sla}
          language={language}
        />

        {ticket.guestNotes && (
          <div className="my-2.5 p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-1.5 leading-snug">
            <span className="text-sm" aria-hidden="true">
              ⚠️
            </span>
            <span className="font-semibold">{ticket.guestNotes}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 py-1.5">
          <span>Server: {ticket.serverName || "Guest QR App"}</span>
          <button
            type="button"
            onClick={() => onPrint?.(ticket)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
            aria-label={`Print ticket ${ticket.ticketNumber}`}
          >
            🖨️ Print Slip
          </button>
        </div>

        <ul className="space-y-2 mt-2" aria-label="Order Items">
          {ticket.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              orderId={ticket.orderId}
              language={language}
              onToggleItem={onToggleItem}
            />
          ))}
        </ul>
      </div>

      <ActionButtonsSection
        ticketNumber={ticket.ticketNumber}
        orderId={ticket.orderId}
        status={ticket.status}
        advanceLabel={advanceLabel}
        canAdvance={canAdvance}
        canRecall={canRecall}
        onAdvance={onAdvance}
        onRecall={onRecall}
      />
    </article>
  );
};
