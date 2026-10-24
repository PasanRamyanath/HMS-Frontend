import { DynamicTokenIcon } from "../components/SvgIcons.js";
/**
 * Unified Staff Smartphone Launcher & Hub (StaffMobileHub.tsx)
 * Single entrypoint for hotel smartphone & tablet operations across departments.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Thumb-friendly responsive bento-grid tiles (>= 44x44pt touch targets, continuous squircle radii)
 * - 6 Core Staff Operational Modules:
 * 1. Kitchen KDS (Kanban & Single-Column Mobile modes, SLA alert timers)
 * 2. Bar BOT (Cocktails, beers, wine dispenser queue)
 * 3. Waiter POS (Interactive table floor map, seat ordering, bill splitting)
 * 4. Order Runner (Ready tray checklist, guest delivery dispatch)
 * 5. Buffet Host (Meal-plan check-off, attendance forecast)
 * 6. Housekeeping (Room turnaround, cleaning queue, priority turn-down)
 * - Quick Action Modals:
 * - Driver / Tour Guide Meal Voucher Redemption Scanner
 * - Daily Outlet Shift X-Read / Z-Read Financial Closing
 * - Chef 1-Tap '86 Item' Quick Stock Out
 * - Screen Wake-Lock integration (prevents screen dimming while on duty)
 * - Translucent .apple-liquid-glass surfaces & .tabular-nums-lkr typography
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useEffect, useMemo, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { navigateTo } from "../lib/router.js";
import { getSoundSettings, playOrderBell, setMuted } from "../lib/soundAlert.js";
import {
  formatWakeLockStatusLabel,
  getWakeLockBadgeColor,
  useWakeLock,
} from "../lib/useWakeLock.js";
import { HousekeepingMobileView } from "./housekeeping/HousekeepingMobileView.js";
import { BarBotView } from "./kds/BarBotView.js";
import { KdsKanbanView } from "./kds/KdsKanbanView.js";
import { KdsStockToggleDrawer } from "./kds/KdsStockToggleDrawer.js";
import { RunnerDeliveryView } from "./kds/RunnerDeliveryView.js";
import { BuffetCheckInView } from "./pos/BuffetCheckInView.js";
import { DriverMealRedeemModal } from "./pos/DriverMealRedeemModal.js";
import { PosTerminalView } from "./pos/PosTerminalView.js";
import { PosZReadModal } from "./pos/PosZReadModal.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type StaffToolId =
  | "KITCHEN_KDS"
  | "BAR_BOT"
  | "WAITER_POS"
  | "ORDER_RUNNER"
  | "BUFFET_HOST"
  | "HOUSEKEEPING";

export type StaffActiveView = "HUB" | StaffToolId;

export type StaffRole =
  | "HEAD_CHEF"
  | "SOUS_CHEF"
  | "LINE_COOK"
  | "BARTENDER"
  | "WAITER"
  | "CAPTAIN"
  | "RESTAURANT_SUPERVISOR"
  | "ROOM_SERVICE_RUNNER"
  | "BUFFET_HOST"
  | "HOUSEKEEPING"
  | "GENERAL_MANAGER";

export interface StaffUserProfile {
  readonly id: string;
  readonly name: string;
  readonly role: StaffRole;
  readonly department: string;
  readonly tenantId: string;
  readonly shiftStartTimeIso: string;
  readonly avatarInitials?: string | undefined;
}

export interface HubBadgeCounts {
  readonly activeKitchenKotCount: number;
  readonly activeBarBotCount: number;
  readonly openTableCount: number;
  readonly readyDeliveriesCount: number;
  readonly buffetCheckedInCount: number;
  readonly dirtyRoomsCount: number;
  readonly urgentSlaAlertsCount: number;
}

export interface StaffMobileHubProps {
  readonly user?: StaffUserProfile | undefined;
  readonly hotelName?: string | undefined;
  readonly initialView?: StaffActiveView | undefined;
  readonly badgeCounts?: Partial<HubBadgeCounts> | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onNavigateTool?: ((toolId: StaffToolId) => void) | undefined;
  readonly onLogout?: (() => void) | undefined;
}

export interface ToolTileConfig {
  readonly id: StaffToolId;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeCount: number;
  readonly accentColor: string;
  readonly iconSvg: string;
}

// ============================================================================
// Constants & Localization
// ============================================================================

export const DEFAULT_STAFF_USER: StaffUserProfile = {
  id: "usr-staff-01",
  name: "Chaminda Rajapaksha",
  role: "LINE_COOK",
  department: "Food & Beverage",
  tenantId: "cinnamon-wild-yala",
  shiftStartTimeIso: "2026-10-20T11:00:00Z",
  avatarInitials: "CR",
};

export const DEFAULT_HUB_BADGES: HubBadgeCounts = {
  activeKitchenKotCount: 6,
  activeBarBotCount: 3,
  openTableCount: 8,
  readyDeliveriesCount: 4,
  buffetCheckedInCount: 42,
  dirtyRoomsCount: 5,
  urgentSlaAlertsCount: 2,
};

interface HubTranslationBundle {
  readonly staffHubTitle: string;
  readonly staffHubSubtitle: string;
  readonly shiftOnDuty: string;
  readonly quickShortcuts: string;
  readonly driverVouchers: string;
  readonly driverVouchersDesc: string;
  readonly shiftZRead: string;
  readonly shiftZReadDesc: string;
  readonly chef86Stock: string;
  readonly chef86StockDesc: string;
  readonly returnToHub: string;
  readonly wakeLockActive: string;
  readonly wakeLockDisabled: string;
  readonly soundOn: string;
  readonly soundOff: string;
  readonly logout: string;
  readonly activeAlerts: string;
  readonly tools: Record<StaffToolId, { title: string; subtitle: string }>;
}

export const HUB_TRANSLATIONS: Record<SupportedLanguage, HubTranslationBundle> = {
  en: {
    staffHubTitle: "Staff Mobile Hub",
    staffHubSubtitle: "Operations Launcher & Shift Dashboard",
    shiftOnDuty: "On Duty",
    quickShortcuts: "Quick Actions & Register",
    driverVouchers: "Driver Meal Vouchers",
    driverVouchersDesc: "Scan DMC Chauffeur Vouchers",
    shiftZRead: "Daily Z-Read Register",
    shiftZReadDesc: "Close Register & Audit Shift",
    chef86Stock: "Chef '86 Item' Drawer",
    chef86StockDesc: "Toggle Out-of-Stock Items",
    returnToHub: "Return to Hub",
    wakeLockActive: "Screen Awake",
    wakeLockDisabled: "Screen Sleep Allowed",
    soundOn: "Alert Audio On",
    soundOff: "Audio Muted",
    logout: "Sign Out",
    activeAlerts: "Urgent Alerts",
    tools: {
      KITCHEN_KDS: {
        title: "Kitchen KDS",
        subtitle: "Cooking queue & ticket SLA escalation",
      },
      BAR_BOT: {
        title: "Bar BOT",
        subtitle: "Cocktails, mocktails & beverage dispense",
      },
      WAITER_POS: {
        title: "Waiter POS",
        subtitle: "Table map, ordering & guest folio split",
      },
      ORDER_RUNNER: {
        title: "Order Runner",
        subtitle: "Ready food dispatch & tray checklist",
      },
      BUFFET_HOST: {
        title: "Buffet Host",
        subtitle: "Guest meal-plan attendance & verification",
      },
      HOUSEKEEPING: {
        title: "Housekeeping",
        subtitle: "Room turnover & express amenity requests",
      },
    },
  },
  si: {
    staffHubTitle: "කාර්ය මණ්ඩල මෙහෙයුම් කේන්ද්රය",
    staffHubSubtitle: "ස්මාර්ට්ෆෝන් මෙවලම් සහ මුර පුවරුව",
    shiftOnDuty: "සේවයේ නියුතුයි",
    quickShortcuts: "ක්ෂණික ක්රියාකාරකම් සහ මුදල් ලේඛනය",
    driverVouchers: "රියදුරු ආහාර වවුචර්",
    driverVouchersDesc: "DMC රියදුරු වවුචර් පරිලෝකනය",
    shiftZRead: "දෛනික Z-වාර්තාව",
    shiftZReadDesc: "මුරය අවසන් කර ගිණුම් පියවීම",
    chef86Stock: "ඉවුම් පිහුම් ද්රව්ය අක්රියකය ('86')",
    chef86StockDesc: "අවසන් වූ කෑම වර්ග සලකුණු කිරීම",
    returnToHub: "ආපසු මුල් පිටුවට",
    wakeLockActive: "තිරය සක්රීයයි",
    wakeLockDisabled: "තිර නිද්රාව සක්රීයයි",
    soundOn: "ශබ්දය ක්රියාත්මකයි",
    soundOff: "නිහඬ කර ඇත",
    logout: "ඉවත් වන්න",
    activeAlerts: "හදිසි ඇඟවීම්",
    tools: {
      KITCHEN_KDS: {
        title: "කුස්සිය (KDS)",
        subtitle: "පිසීමේ ඇණවුම් පෝලිම සහ කාල සීමා",
      },
      BAR_BOT: {
        title: "පානයන් (BOT)",
        subtitle: "කොක්ටේල් සහ බීම ඇණවුම්",
      },
      WAITER_POS: {
        title: "වේටර් POS",
        subtitle: "මේස සිතියම සහ බිල්පත් ගෙවීම්",
      },
      ORDER_RUNNER: {
        title: "ආහාර බෙදාහරින්නා",
        subtitle: "කාමර වෙත බෙදාහැරීමේ පිරික්සුම් ලැයිස්තුව",
      },
      BUFFET_HOST: {
        title: "බුෆේ පාලක",
        subtitle: "අමුත්තන්ගේ ආහාර පැකේජ සත්යාපනය",
      },
      HOUSEKEEPING: {
        title: "කාමර සේවාව",
        subtitle: "කාමර පිරිසිදු කිරීම සහ පහසුකම්",
      },
    },
  },
  ta: {
    staffHubTitle: "ஊழியர் மொபைல் மையம்",
    staffHubSubtitle: "செயல்பாடுகள் துவக்கி & ஷிப்ட் பலகை",
    shiftOnDuty: "பணியில்",
    quickShortcuts: "விரைவு நடவடிக்கைகள் & பதிவேடு",
    driverVouchers: "ஓட்டுநர் உணவு வவுச்சர்கள்",
    driverVouchersDesc: "DMC ஓட்டுநர் வவுச்சர் ஸ்கேன்",
    shiftZRead: "தினசரி Z-அறிக்கை",
    shiftZReadDesc: "பதிவேட்டை மூடி கணக்கு முடித்தல்",
    chef86Stock: "முடிவடைந்த உணவு மாற்றி ('86')",
    chef86StockDesc: "இருப்பில்லாத உணவுகளை குறிக்கவும்",
    returnToHub: "மையத்திற்கு திரும்பு",
    wakeLockActive: "திரை விழித்திருக்கிறது",
    wakeLockDisabled: "திரை தூங்கலாம்",
    soundOn: "ஒலி இயக்கத்தில்",
    soundOff: "ஒலி முடக்கப்பட்டது",
    logout: "வெளியேறு",
    activeAlerts: "அவசர எச்சரிக்கைகள்",
    tools: {
      KITCHEN_KDS: {
        title: "சமையலறை (KDS)",
        subtitle: "சமையல் வரிசை & நேர வரம்புகள்",
      },
      BAR_BOT: {
        title: "பானங்கள் (BOT)",
        subtitle: "காக்டெய்ல் & பான வரிசை",
      },
      WAITER_POS: {
        title: "சர்வர் POS",
        subtitle: "மேசை வரைபடம் & பில் கட்டணம்",
      },
      ORDER_RUNNER: {
        title: "உணவு வழங்குபவர்",
        subtitle: "அறை விநியோக சரிபார்ப்புப் பட்டியல்",
      },
      BUFFET_HOST: {
        title: "பஃபே ஒருங்கிணைப்பாளர்",
        subtitle: "விருந்தினர் உணவுத் திட்டம் சரிபார்ப்பு",
      },
      HOUSEKEEPING: {
        title: "அறை பராமரிப்பு",
        subtitle: "அறை தூய்மை & வசதிகள் கோரிக்கை",
      },
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getRoleDefaultTool(role: StaffRole): StaffToolId {
  switch (role) {
    case "HEAD_CHEF":
    case "SOUS_CHEF":
    case "LINE_COOK":
      return "KITCHEN_KDS";
    case "BARTENDER":
      return "BAR_BOT";
    case "WAITER":
    case "CAPTAIN":
    case "RESTAURANT_SUPERVISOR":
    case "GENERAL_MANAGER":
      return "WAITER_POS";
    case "ROOM_SERVICE_RUNNER":
      return "ORDER_RUNNER";
    case "BUFFET_HOST":
      return "BUFFET_HOST";
    case "HOUSEKEEPING":
      return "HOUSEKEEPING";
    default:
      return "WAITER_POS";
  }
}

export function formatShiftDuration(startTimeIso: string, nowMs = Date.now()): string {
  const startMs = Date.parse(startTimeIso);
  if (Number.isNaN(startMs) || startMs > nowMs) {
    return "00:00:00";
  }
  const diffSec = Math.floor((nowMs - startMs) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function getToolAccentBorder(toolId: StaffToolId): string {
  switch (toolId) {
    case "KITCHEN_KDS":
      return "border-[#FF9500]/40 hover:border-[#FF9500]";
    case "BAR_BOT":
      return "border-[#AF52DE]/40 hover:border-[#AF52DE]";
    case "WAITER_POS":
      return "border-[#007AFF]/40 hover:border-[#007AFF]";
    case "ORDER_RUNNER":
      return "border-[#34C759]/40 hover:border-[#34C759]";
    case "BUFFET_HOST":
      return "border-[#30B0C7]/40 hover:border-[#30B0C7]";
    case "HOUSEKEEPING":
      return "border-[#FF9500]/40 hover:border-[#FF9500]";
    default:
      return "border-[#E2E8F0] hover:border-[#E2E8F0]";
  }
}

export function getToolBadgeBg(toolId: StaffToolId): string {
  switch (toolId) {
    case "KITCHEN_KDS":
      return "bg-[#FF9500] text-black";
    case "BAR_BOT":
      return "bg-[#AF52DE] text-white";
    case "WAITER_POS":
      return "bg-[#007AFF] text-white";
    case "ORDER_RUNNER":
      return "bg-[#34C759] text-black";
    case "BUFFET_HOST":
      return "bg-[#30B0C7] text-black";
    case "HOUSEKEEPING":
      return "bg-[#FF9500] text-black";
    default:
      return "bg-slate-700 text-white";
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface HubTopBarProps {
  readonly hotelName: string;
  readonly user: StaffUserProfile;
  readonly language: SupportedLanguage;
  readonly onSelectLanguage: (lang: SupportedLanguage) => void;
  readonly onLogout?: (() => void) | undefined;
}

const HubTopBar: FC<HubTopBarProps> = ({
  hotelName,
  user,
  language,
  onSelectLanguage,
  onLogout,
}) => {
  const t = HUB_TRANSLATIONS[language];
  const wakeLock = useWakeLock({ autoAcquire: false });
  const [isAudioMuted, setIsAudioMuted] = useState(() => getSoundSettings().isMuted);

  const toggleSound = () => {
    const nextMuted = !isAudioMuted;
    setMuted(nextMuted);
    setIsAudioMuted(nextMuted);
    if (!nextMuted) {
      void playOrderBell("NEW_ORDER");
    }
  };

  const handleWakeLockToggle = () => {
    void wakeLock.toggle();
  };

  return (
    <header className="apple-liquid-glass sticky top-0 z-40 px-4 py-3 border-b border-[#E2E8F0] backdrop-blur-xl bg-white text-slate-900 flex items-center justify-between gap-3">
      {/* Property & Staff Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-amber-500 hover:bg-amber-600 w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-black text-sm shrink-0 shadow-md">
          {user.avatarInitials || user.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold truncate leading-tight tracking-tight text-slate-900">
            {hotelName}
          </h1>
          <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
            <span className="font-medium text-slate-700">{user.name}</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-[11px] font-semibold text-[#0B6E4F]">{user.role}</span>
          </p>
        </div>
      </div>

      {/* Quick Controls: Wake-Lock Pill, Sound Toggle, Lang, Logout */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Wake-Lock Pill */}
        <button
          type="button"
          onClick={handleWakeLockToggle}
          title={wakeLock.isActive ? t.wakeLockActive : t.wakeLockDisabled}
          className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all min-h-[36px] ${getWakeLockBadgeColor(wakeLock.status)}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${wakeLock.isActive ? "bg-[#34C759] animate-pulse" : "bg-slate-400"}`}
          />
          <span className="hidden sm:inline">
            {formatWakeLockStatusLabel(wakeLock.status, language)}
          </span>
        </button>

        {/* Audio Alert Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          title={isAudioMuted ? t.soundOff : t.soundOn}
          className={`p-2 rounded-full border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
            isAudioMuted
              ? "bg-slate-100 border-slate-700 text-slate-400"
              : "bg-emerald-500/20 border-emerald-500/40 text-[#0B6E4F]"
          }`}
          aria-label={isAudioMuted ? t.soundOff : t.soundOn}
        >
          <DynamicTokenIcon token={isAudioMuted ? "Muted" : "Bell"} />
        </button>

        {/* Language Pill Switcher */}
        <div className="flex bg-slate-100 rounded-full p-0.5 border border-[#E2E8F0] text-xs">
          {(["en", "si", "ta"] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => onSelectLanguage(lng)}
              className={`px-2 py-1 rounded-full font-medium transition-all min-h-[32px] ${
                language === lng
                  ? "bg-amber-500 text-black font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Switch to Admin PMS */}
        <button
          type="button"
          onClick={() => navigateTo("/admin")}
          title="Switch to PMS Admin Portal"
          className="px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-800 text-xs font-semibold hover:bg-sky-500/30 transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer"
        >
          <span className="hidden sm:inline">PMS Admin</span>
        </button>

        {/* Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={t.logout}
            className="p-2 rounded-full bg-slate-100 hover:bg-red-500/20 text-slate-400 hover:text-red-700 border border-[#E2E8F0] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={t.logout}
          >
            x
          </button>
        )}
      </div>
    </header>
  );
};

interface ShiftBannerProps {
  readonly user: StaffUserProfile;
  readonly badgeCounts: HubBadgeCounts;
  readonly language: SupportedLanguage;
}

const ShiftBanner: FC<ShiftBannerProps> = ({ user, badgeCounts, language }) => {
  const t = HUB_TRANSLATIONS[language];
  const shiftDuration = formatShiftDuration(user.shiftStartTimeIso);

  return (
    <section className="apple-liquid-glass mx-4 mt-4 p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl text-slate-900 shadow-xl flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              {t.shiftOnDuty}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-500/30">
              Active Shift
            </span>
          </div>
          <p className="tabular-nums-lkr text-lg font-bold text-slate-900 tracking-tight mt-0.5">
            {shiftDuration}
          </p>
        </div>
      </div>

      {badgeCounts.urgentSlaAlertsCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          <span>
            {badgeCounts.urgentSlaAlertsCount} {t.activeAlerts}
          </span>
        </div>
      )}
    </section>
  );
};

interface ToolGridProps {
  readonly configs: readonly ToolTileConfig[];
  readonly onSelectTool: (id: StaffToolId) => void;
}

const ToolGrid: FC<ToolGridProps> = ({ configs, onSelectTool }) => {
  return (
    <section className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {configs.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => onSelectTool(tool.id)}
          className={`apple-liquid-glass group relative p-5 rounded-2xl bg-white border backdrop-blur-xl text-left transition-all duration-300 hover:scale-[1.015] active:scale-[0.985] min-h-[120px] flex flex-col justify-between shadow-lg ${getToolAccentBorder(
            tool.id,
          )}`}
        >
          {/* Top row: Icon and Badge Counter */}
          <div className="flex items-start justify-between gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-bold uppercase tracking-wider text-[#0B6E4F]">
              <DynamicTokenIcon token={tool.iconSvg} />
            </span>
            {tool.badgeCount > 0 && (
              <span
                className={`tabular-nums-lkr px-2.5 py-1 rounded-full text-xs font-bold shadow-md ${getToolBadgeBg(
                  tool.id,
                )}`}
              >
                {tool.badgeCount}
              </span>
            )}
          </div>

          {/* Bottom row: Titles */}
          <div className="mt-3">
            <h2 className="text-base font-bold text-slate-900 group-hover:text-[#0B6E4F] transition-colors">
              {tool.title}
            </h2>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
              {tool.subtitle}
            </p>
          </div>
        </button>
      ))}
    </section>
  );
};

interface QuickActionsProps {
  readonly language: SupportedLanguage;
  readonly onOpenDriverVoucher: () => void;
  readonly onOpenZRead: () => void;
  readonly onOpenStockDrawer: () => void;
}

const QuickActions: FC<QuickActionsProps> = ({
  language,
  onOpenDriverVoucher,
  onOpenZRead,
  onOpenStockDrawer,
}) => {
  const t = HUB_TRANSLATIONS[language];

  return (
    <section className="px-4 pb-8">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
        {t.quickShortcuts}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Driver Meal Voucher Modal Trigger */}
        <button
          type="button"
          onClick={onOpenDriverVoucher}
          className="apple-liquid-glass p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs hover:border-emerald-500/40 text-left transition-all active:scale-95 flex items-center gap-3 min-h-[56px]"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{t.driverVouchers}</p>
            <p className="text-[11px] text-slate-400 truncate">{t.driverVouchersDesc}</p>
          </div>
        </button>

        {/* Outlet Shift Z-Read Modal Trigger */}
        <button
          type="button"
          onClick={onOpenZRead}
          className="apple-liquid-glass p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs hover:border-amber-500/40 text-left transition-all active:scale-95 flex items-center gap-3 min-h-[56px]"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{t.shiftZRead}</p>
            <p className="text-[11px] text-slate-400 truncate">{t.shiftZReadDesc}</p>
          </div>
        </button>

        {/* Chef Stock Out 86 Items Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenStockDrawer}
          className="apple-liquid-glass p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs hover:border-red-500/40 text-left transition-all active:scale-95 flex items-center gap-3 min-h-[56px]"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{t.chef86Stock}</p>
            <p className="text-[11px] text-slate-400 truncate">{t.chef86StockDesc}</p>
          </div>
        </button>
      </div>
    </section>
  );
};

// ============================================================================
// Main Component: StaffMobileHub
// ============================================================================

export const StaffMobileHub: FC<StaffMobileHubProps> = ({
  user = DEFAULT_STAFF_USER,
  hotelName = "CEYLON HERITAGE RESORT & SPA",
  initialView = "HUB",
  badgeCounts = DEFAULT_HUB_BADGES,
  language = "en",
  onNavigateTool,
  onLogout,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const [activeView, setActiveView] = useState<StaffActiveView>(initialView);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isZReadModalOpen, setIsZReadModalOpen] = useState(false);
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);

  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  const t = HUB_TRANSLATIONS[selectedLanguage];
  const mergedBadges: HubBadgeCounts = useMemo(
    () => ({ ...DEFAULT_HUB_BADGES, ...badgeCounts }),
    [badgeCounts],
  );

  const toolConfigs: readonly ToolTileConfig[] = useMemo(
    () => [
      {
        id: "KITCHEN_KDS",
        title: t.tools.KITCHEN_KDS.title,
        subtitle: t.tools.KITCHEN_KDS.subtitle,
        badgeCount: mergedBadges.activeKitchenKotCount,
        accentColor: "#FF9500",
        iconSvg: "Kitchen",
      },
      {
        id: "BAR_BOT",
        title: t.tools.BAR_BOT.title,
        subtitle: t.tools.BAR_BOT.subtitle,
        badgeCount: mergedBadges.activeBarBotCount,
        accentColor: "#AF52DE",
        iconSvg: "Bar",
      },
      {
        id: "WAITER_POS",
        title: t.tools.WAITER_POS.title,
        subtitle: t.tools.WAITER_POS.subtitle,
        badgeCount: mergedBadges.openTableCount,
        accentColor: "#007AFF",
        iconSvg: "Bell",
      },
      {
        id: "ORDER_RUNNER",
        title: t.tools.ORDER_RUNNER.title,
        subtitle: t.tools.ORDER_RUNNER.subtitle,
        badgeCount: mergedBadges.readyDeliveriesCount,
        accentColor: "#34C759",
        iconSvg: "Skip",
      },
      {
        id: "BUFFET_HOST",
        title: t.tools.BUFFET_HOST.title,
        subtitle: t.tools.BUFFET_HOST.subtitle,
        badgeCount: mergedBadges.buffetCheckedInCount,
        accentColor: "#30B0C7",
        iconSvg: "Dining",
      },
      {
        id: "HOUSEKEEPING",
        title: t.tools.HOUSEKEEPING.title,
        subtitle: t.tools.HOUSEKEEPING.subtitle,
        badgeCount: mergedBadges.dirtyRoomsCount,
        accentColor: "#FF9500",
        iconSvg: "Clean",
      },
    ],
    [t, mergedBadges],
  );

  const handleSelectTool = (toolId: StaffToolId) => {
    setActiveView(toolId);
    onNavigateTool?.(toolId);
  };

  const handleReturnToHub = () => {
    setActiveView("HUB");
    navigateTo("/staff");
  };

  // --------------------------------------------------------------------------
  // Full-Screen Embedded Views for Core Staff Tools
  // --------------------------------------------------------------------------
  if (activeView !== "HUB") {
    return (
      <div className="min-h-screen bg-[#F4F7F5] text-slate-900 flex flex-col">
        {/* Navigation Return Bar */}
        <div className="apple-liquid-glass sticky top-0 z-50 px-4 py-2.5 bg-white border-b border-[#E2E8F0] backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReturnToHub}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#0B6E4F] font-bold text-xs flex items-center gap-1.5 transition-all min-h-[36px] cursor-pointer"
            >
              <span>←</span>
              <span>{t.returnToHub}</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin")}
              title="Return to PMS Admin Portal"
              className="px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 font-semibold text-xs flex items-center gap-1.5 transition-all min-h-[36px] cursor-pointer"
            >
              <span className="hidden sm:inline">PMS Admin</span>
            </button>
          </div>
          <div className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
            {toolConfigs.find((c) => c.id === activeView)?.title}
          </div>
        </div>

        {/* View Router */}
        <main className="flex-1">
          {activeView === "KITCHEN_KDS" && <KdsKanbanView />}
          {activeView === "BAR_BOT" && <BarBotView />}
          {activeView === "WAITER_POS" && <PosTerminalView />}
          {activeView === "ORDER_RUNNER" && <RunnerDeliveryView />}
          {activeView === "BUFFET_HOST" && <BuffetCheckInView />}
          {activeView === "HOUSEKEEPING" && (
            <HousekeepingMobileView
              language={selectedLanguage}
              onNavigateBack={handleReturnToHub}
            />
          )}
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Staff Hub View
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-900 flex flex-col font-sans">
      {/* Top Bar */}
      <HubTopBar
        hotelName={hotelName}
        user={user}
        language={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto">
        {/* Hub Launcher Title */}
        <div className="px-4 pt-4 pb-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t.staffHubTitle}</h2>
          <p className="text-xs text-slate-400">{t.staffHubSubtitle}</p>
        </div>

        {/* Active Shift Overview Card */}
        <ShiftBanner user={user} badgeCounts={mergedBadges} language={selectedLanguage} />

        {/* Primary Operational Tool Grid */}
        <ToolGrid configs={toolConfigs} onSelectTool={handleSelectTool} />

        {/* Quick Operations & Register Drawers */}
        <QuickActions
          language={selectedLanguage}
          onOpenDriverVoucher={() => setIsDriverModalOpen(true)}
          onOpenZRead={() => setIsZReadModalOpen(true)}
          onOpenStockDrawer={() => setIsStockDrawerOpen(true)}
        />
      </main>

      {/* Driver Voucher Redemption Modal */}
      {isDriverModalOpen && (
        <DriverMealRedeemModal
          isOpen={isDriverModalOpen}
          onClose={() => setIsDriverModalOpen(false)}
          onConfirmRedeem={() => setIsDriverModalOpen(false)}
          language={selectedLanguage}
          hotelName={hotelName}
        />
      )}

      {/* Daily Shift Z-Read Modal */}
      {isZReadModalOpen && (
        <PosZReadModal
          isOpen={isZReadModalOpen}
          onClose={() => setIsZReadModalOpen(false)}
          onCommitZRead={() => setIsZReadModalOpen(false)}
          language={selectedLanguage}
        />
      )}

      {/* Chef Stock Out 86 Item Drawer */}
      <KdsStockToggleDrawer
        isOpen={isStockDrawerOpen}
        onClose={() => setIsStockDrawerOpen(false)}
      />
    </div>
  );
};
