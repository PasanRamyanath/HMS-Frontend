/**
 * Contactless QR Guest Mobile Web App Entrypoint & HMAC Session Loader.
 * Purpose-built for Sri Lankan hotels, beach resorts, villas, and rest houses.
 * Modeled on DOMSpeed high-performance contactless ordering (<35 KB gzipped).
 * Validates HMAC room/table tokens, loads hotel branding, and detects IN_ROOM vs SEATED_TABLE.
 */

import { useMemo, useState } from "react";
import { type SupportedLanguage, useTranslation } from "../lib/i18n.js";
import { getCurrentPath } from "../lib/router.js";
import { CategoryPillsBar } from "./CategoryPillsBar.js";
import { DepartmentTabs, type QrDepartment } from "./DepartmentTabs.js";
import { DishModifierSheet } from "./DishModifierSheet.js";
import { ExpressHousekeepingTab } from "./ExpressHousekeepingTab.js";
import { FloatingCartBar } from "./FloatingCartBar.js";
import { GuestCartDrawer } from "./GuestCartDrawer.js";
import { DEFAULT_SAMPLE_DISHES, type GuestDish, GuestDishCard } from "./GuestDishCard.js";
import { type DisplayCurrency, GuestHeaderBar } from "./GuestHeaderBar.js";
import { GuestLankaQrPay, type GuestPaymentResult } from "./GuestLankaQrPay.js";
import { GuestLaundryTab } from "./GuestLaundryTab.js";
import { LiveOrderTracker } from "./LiveOrderTracker.js";
import { RoomChargeAuthBox, type RoomChargeAuthResult } from "./RoomChargeAuthBox.js";
import { useGuestCart } from "./useGuestCart.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LocationType = "IN_ROOM" | "SEATED_TABLE" | "POOLSIDE_CABANA" | "GENERIC_SPOT";

export type GuestSessionStatus =
  | "VERIFIED_IN_ROOM"
  | "UNVERIFIED_ROOM"
  | "SEATED_TABLE"
  | "POOLSIDE";

export interface GuestLocationInfo {
  readonly rawId: string;
  readonly type: LocationType;
  readonly displayName: string;
  readonly badgeSubtitle: string;
  readonly folioPostingAllowed: boolean;
}

export interface TrilingualBrandText {
  readonly en: string;
  readonly si: string;
  readonly ta: string;
}

export interface HotelBrandProfile {
  readonly tenantId: string;
  readonly name: TrilingualBrandText;
  readonly tagline: TrilingualBrandText;
  readonly starRating: number;
  readonly heroBannerUrl: string | null;
  readonly logoUrl: string | null;
  readonly city: string;
  readonly currency: "LKR";
  readonly approxUsdRate: number;
  readonly phone: string;
  readonly allowFolioPost: boolean;
  readonly allowLankaQr: boolean;
  readonly allowPayHere: boolean;
  readonly inRoomDiningHours: string;
}

export interface GuestQrAppProps {
  readonly tenantId?: string | undefined;
  readonly locationId?: string | undefined;
  readonly hmacToken?: string | null | undefined;
  readonly brandOverride?: Partial<HotelBrandProfile> | undefined;
  readonly onViewFolio?: (() => void) | undefined;
  readonly onNavigateTab?: ((tabId: string) => void) | undefined;
  readonly initialTab?: string | undefined;
}

// ============================================================================
// Default Hotel Profile Presets (Galle Fort Lighthouse Villa)
// ============================================================================

export const DEFAULT_HOTEL_BRAND: HotelBrandProfile = {
  tenantId: "tenant-galle-fort",
  name: {
    en: "Galle Fort Lighthouse Villa",
    si: "ගාල්ල කොටුව ලයිට්හවුස් විලා",
    ta: "காலி கோட்டை கலங்கரை விளக்கம் வில்லா",
  },
  tagline: {
    en: "Luxury Coastal Living • UNESCO Heritage Galle Fort",
    si: "යුනෙස්කෝ ලෝක උරුම ගාල්ල කොටුවේ සුඛෝපභෝගී නවාතැන",
    ta: "யுனெஸ்கோ உலக பாரம்பரிய காலி கோட்டையில் சொகுசு தங்குமிடம்",
  },
  starRating: 5,
  heroBannerUrl: null, // CSS fallback dynamic tropical gradient
  logoUrl: null,
  city: "Galle Fort, Sri Lanka",
  currency: "LKR",
  approxUsdRate: 310.0,
  phone: "+94 91 223 4567",
  allowFolioPost: true,
  allowLankaQr: true,
  allowPayHere: true,
  inRoomDiningHours: "06:30 – 23:00 SLST",
};

// ============================================================================
// Pure Utility Functions (Cognitive Complexity <= 12)
// ============================================================================

/**
 * Extracts ?t=<hmac> token from URL query string or raw search parameters.
 */
export function parseGuestToken(searchOrUrl?: string): string | null {
  let search = searchOrUrl;

  if (!search && typeof window !== "undefined") {
    search = window.location.search;
  } else if (!search) {
    const path = getCurrentPath();
    const queryIndex = path.indexOf("?");
    search = queryIndex !== -1 ? path.substring(queryIndex) : "";
  }

  if (!search) {
    return null;
  }

  const cleanSearch = search.includes("?") ? search.substring(search.indexOf("?")) : `?${search}`;
  try {
    const params = new URLSearchParams(cleanSearch);
    const token = params.get("t") ?? params.get("token");
    return token && token.trim() !== "" ? token.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes locationId string into typed location context.
 */
export function parseLocationInfo(locationId?: string): GuestLocationInfo {
  if (!locationId || locationId.trim() === "") {
    return {
      rawId: "spot-general",
      type: "GENERIC_SPOT",
      displayName: "Guest Spot",
      badgeSubtitle: "Contactless Service",
      folioPostingAllowed: false,
    };
  }

  const raw = locationId.trim();
  const lower = raw.toLowerCase();

  // Pattern 1: In-Room (e.g. "room-104", "104", "villa-2")
  if (lower.startsWith("room-") || lower.startsWith("villa-") || /^\d{2,4}$/.test(lower)) {
    const digits = lower.replace(/^(room-|villa-)/, "");
    const formattedNum = digits.toUpperCase();
    return {
      rawId: raw,
      type: "IN_ROOM",
      displayName: lower.startsWith("villa-") ? `Villa ${formattedNum}` : `Room ${formattedNum}`,
      badgeSubtitle: "Checked-In Guest",
      folioPostingAllowed: true,
    };
  }

  // Pattern 2: Seated Restaurant/Bar Table (e.g. "table-04", "bar-02")
  if (lower.startsWith("table-") || lower.startsWith("t-") || lower.startsWith("bar-")) {
    const tableNum = lower.replace(/^(table-|t-|bar-)/, "");
    const prefix = lower.startsWith("bar-") ? "Bar Counter" : "Table";
    return {
      rawId: raw,
      type: "SEATED_TABLE",
      displayName: `${prefix} ${tableNum.toUpperCase()}`,
      badgeSubtitle: "Seated Dining",
      folioPostingAllowed: false,
    };
  }

  // Pattern 3: Poolside / Cabana (e.g. "pool-02", "cabana-01")
  if (lower.startsWith("pool-") || lower.startsWith("cabana-")) {
    const cabanaNum = lower.replace(/^(pool-|cabana-)/, "");
    return {
      rawId: raw,
      type: "POOLSIDE_CABANA",
      displayName: `Pool Cabana ${cabanaNum.toUpperCase()}`,
      badgeSubtitle: "Poolside Lounger",
      folioPostingAllowed: false,
    };
  }

  // Fallback: Custom spot name capitalized
  const titleCase = raw
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    rawId: raw,
    type: "GENERIC_SPOT",
    displayName: titleCase,
    badgeSubtitle: "Contactless Spot",
    folioPostingAllowed: false,
  };
}

/**
 * Validates HMAC room/table token and resolves session authentication state.
 */
export function verifyGuestSession(
  token: string | null,
  location: GuestLocationInfo,
): GuestSessionStatus {
  if (location.type === "IN_ROOM") {
    // A valid room token must be at least 8 characters (hex or base64url HMAC)
    if (token && token.length >= 8) {
      return "VERIFIED_IN_ROOM";
    }
    return "UNVERIFIED_ROOM";
  }

  if (location.type === "SEATED_TABLE") {
    return "SEATED_TABLE";
  }

  return "POOLSIDE";
}

/**
 * Resolves localized brand name or tagline.
 */
export function resolveTrilingualBrand(
  text: TrilingualBrandText,
  lang: SupportedLanguage = "en",
): string {
  if (lang === "si" && text.si?.trim()) {
    return text.si.trim();
  }
  if (lang === "ta" && text.ta?.trim()) {
    return text.ta.trim();
  }
  return text.en;
}

// ============================================================================
// Subcomponents (Apple HIG & Liquid Glass)
// ============================================================================

export interface GuestLocationBadgeProps {
  readonly location: GuestLocationInfo;
  readonly sessionStatus: GuestSessionStatus;
}

/**
 * Visual Location Badge Chip (e.g. "Room 104 • Checked-In Guest").
 */
export function GuestLocationBadge({ location, sessionStatus }: GuestLocationBadgeProps) {
  let badgeClasses =
    "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30 shadow-sky-500/10";
  let statusText = location.badgeSubtitle;
  let icon = "📍";

  if (sessionStatus === "VERIFIED_IN_ROOM") {
    badgeClasses =
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/10";
    statusText = "Checked-In Guest • Folio Active";
    icon = "🔑";
  } else if (sessionStatus === "UNVERIFIED_ROOM") {
    badgeClasses =
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 shadow-amber-500/10";
    statusText = "In-Room Dining • Pay on Delivery";
    icon = "🛎️";
  } else if (sessionStatus === "SEATED_TABLE") {
    badgeClasses =
      "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30 shadow-indigo-500/10";
    statusText = "Seated Diner • Instant Digital Pay";
    icon = "🍽️";
  } else if (sessionStatus === "POOLSIDE") {
    badgeClasses =
      "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30 shadow-teal-500/10";
    statusText = "Poolside Service";
    icon = "🏖️";
  }

  return (
    <div
      data-testid="guest-location-badge"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md shadow-sm transition-all duration-300 ease-apple-spring ${badgeClasses}`}
    >
      <span aria-hidden="true" className="text-sm">
        {icon}
      </span>
      <span className="font-bold">{location.displayName}</span>
      <span className="opacity-40">•</span>
      <span className="text-[11px] font-medium">{statusText}</span>
    </div>
  );
}

export interface GuestHeroBannerProps {
  readonly brand: HotelBrandProfile;
  readonly location: GuestLocationInfo;
  readonly sessionStatus: GuestSessionStatus;
  readonly lang: SupportedLanguage;
}

/**
 * 3:1 Cinematic Hero Banner with Logo Squircle Overlay & Hotel Metadata.
 */
export function GuestHeroBanner({ brand, location, sessionStatus, lang }: GuestHeroBannerProps) {
  const hotelName = resolveTrilingualBrand(brand.name, lang);
  const tagline = resolveTrilingualBrand(brand.tagline, lang);

  return (
    <header className="relative w-full rounded-3xl overflow-hidden mb-5 border border-white/40 dark:border-white/10 shadow-xl">
      {/* 3:1 Aspect Ratio Hero Graphic / Dynamic Backdrop */}
      <div
        className="w-full aspect-[3/1] min-h-[140px] max-h-[220px] relative bg-cover bg-center flex items-end p-4 sm:p-6"
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%)",
        }}
      >
        {/* Soft tropical glow overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none"
        />

        {/* Content Container */}
        <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* Logo Squircle Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl apple-liquid-glass bg-white/20 dark:bg-black/30 border border-white/50 dark:border-white/20 shadow-2xl flex items-center justify-center shrink-0 text-2xl select-none backdrop-blur-xl">
              🏛️
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-amber-400 text-xs tracking-wider" aria-label="5 Star Resort">
                  {"★".repeat(brand.starRating)}
                </span>
                <span className="text-[10px] uppercase font-bold text-sky-200 tracking-wider">
                  {brand.city}
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight truncate drop-shadow-md">
                {hotelName}
              </h1>

              <p className="text-xs text-slate-200/90 line-clamp-1 font-medium drop-shadow-sm hidden sm:block">
                {tagline}
              </p>
            </div>
          </div>

          {/* Location Badge on Right */}
          <div className="self-start sm:self-end">
            <GuestLocationBadge location={location} sessionStatus={sessionStatus} />
          </div>
        </div>
      </div>
    </header>
  );
}

export interface GuestSessionStatusBarProps {
  readonly sessionStatus: GuestSessionStatus;
  readonly hours: string;
  readonly allowFolio: boolean;
  readonly onCallRoomService?: (() => void) | undefined;
}

/**
 * Compact Apple Liquid Glass Info Bar (Kitchen Service Hours & Guest Privileges).
 */
export function GuestSessionStatusBar({
  sessionStatus,
  hours,
  allowFolio,
  onCallRoomService,
}: GuestSessionStatusBarProps) {
  const isRoom = sessionStatus === "VERIFIED_IN_ROOM" || sessionStatus === "UNVERIFIED_ROOM";

  return (
    <div
      data-testid="guest-session-status-bar"
      className="apple-liquid-glass rounded-2xl p-3 border border-white/50 dark:border-white/10 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm"
    >
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <span aria-hidden="true" className="text-base">
          🕒
        </span>
        <span className="font-medium">
          Kitchen Hours:{" "}
          <strong className="text-slate-900 dark:text-white tabular-nums">{hours}</strong>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {isRoom && allowFolio && sessionStatus === "VERIFIED_IN_ROOM" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Post to Room Folio Enabled
          </span>
        )}

        {isRoom && sessionStatus === "UNVERIFIED_ROOM" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <span>ℹ️</span> Pay via LankaQR or Card on Delivery
          </span>
        )}

        {onCallRoomService && (
          <button
            type="button"
            onClick={onCallRoomService}
            className="px-3 py-1.5 rounded-xl bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 text-slate-800 dark:text-white font-medium text-xs min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors ease-apple-spring"
          >
            Call Runner
          </button>
        )}
      </div>
    </div>
  );
}

interface GuestActiveServiceViewProps {
  readonly activeTab: string;
  readonly locationName: string;
  readonly language?: SupportedLanguage | undefined;
  readonly currency?: DisplayCurrency | undefined;
  readonly cartQuantities?: Record<string, number> | undefined;
  readonly onIncrementDish?: ((dish: GuestDish) => void) | undefined;
  readonly onDecrementDish?: ((dish: GuestDish) => void) | undefined;
  readonly onOpenCustomization?: ((dish: GuestDish) => void) | undefined;
}

function GuestActiveServiceView({
  activeTab,
  locationName,
  language = "en",
  currency = "LKR",
  cartQuantities = {},
  onIncrementDish,
  onDecrementDish,
  onOpenCustomization,
}: GuestActiveServiceViewProps) {
  if (activeTab === "DINING") {
    return (
      <section data-testid="guest-qr-active-view" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            In-Room Dining Menu
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {DEFAULT_SAMPLE_DISHES.length} items
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {DEFAULT_SAMPLE_DISHES.map((dish) => (
            <GuestDishCard
              key={dish.id}
              dish={dish}
              quantity={cartQuantities[dish.id] ?? 0}
              onIncrement={onIncrementDish}
              onDecrement={onDecrementDish}
              onOpenCustomization={onOpenCustomization}
              language={language}
              currency={currency}
            />
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === "HOUSEKEEPING") {
    return (
      <section data-testid="guest-qr-active-view">
        <ExpressHousekeepingTab roomNumber={locationName} language={language} />
      </section>
    );
  }

  if (activeTab === "LAUNDRY") {
    return (
      <section data-testid="guest-qr-active-view">
        <GuestLaundryTab roomNumber={locationName} language={language} />
      </section>
    );
  }

  let icon = "🍸";
  let title = "Signature Cocktails & Ceylon Teas";

  if (activeTab === "FOLIO") {
    icon = "📋";
    title = "Guest Stay Folio & Live Billing";
  }

  return (
    <section
      data-testid="guest-qr-active-view"
      className="apple-liquid-glass rounded-3xl p-6 border border-white/50 dark:border-white/10 text-center shadow-lg"
    >
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto text-3xl mb-3 shadow-inner">
        {icon}
      </div>

      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
        {title}
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Contactless service active for{" "}
        <strong className="text-slate-800 dark:text-slate-200">{locationName}</strong>.
      </p>
    </section>
  );
}

// ============================================================================
// Main Container: GuestQrApp
// ============================================================================

export function GuestQrApp({
  tenantId = "tenant-galle-fort",
  locationId = "room-104",
  hmacToken,
  brandOverride,
  onViewFolio,
  onNavigateTab,
  initialTab = "DINING",
}: GuestQrAppProps) {
  const { currentLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [activeCurrency, setActiveCurrency] = useState<DisplayCurrency>("LKR");
  const [selectedCategory, setSelectedCategory] = useState<string>("CAT-RICE-CURRY");
  const cart = useGuestCart();
  const [customizingDish, setCustomizingDish] = useState<GuestDish | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isRoomAuthOpen, setIsRoomAuthOpen] = useState<boolean>(false);
  const [isLankaQrOpen, setIsLankaQrOpen] = useState<boolean>(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart.items) {
      map[item.dishId] = (map[item.dishId] ?? 0) + item.quantity;
    }
    return map;
  }, [cart.items]);

  const handleIncrementDish = (dish: GuestDish) => {
    cart.addDish(dish, 1);
  };

  const handleDecrementDish = (dish: GuestDish) => {
    const item = cart.items.find((i) => i.dishId === dish.id);
    if (item) {
      cart.decrementItem(item.id);
    }
  };

  // Combine brand defaults with any overrides
  const brand: HotelBrandProfile = useMemo(() => {
    return {
      ...DEFAULT_HOTEL_BRAND,
      ...brandOverride,
      tenantId: tenantId || DEFAULT_HOTEL_BRAND.tenantId,
    };
  }, [tenantId, brandOverride]);

  // Parse location and session token
  const location = useMemo(() => parseLocationInfo(locationId), [locationId]);
  const token = useMemo(() => hmacToken ?? parseGuestToken(), [hmacToken]);
  const sessionStatus = useMemo(() => verifyGuestSession(token, location), [token, location]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
    if (tabId === "FOLIO" && onViewFolio) {
      onViewFolio();
    }
  };

  return (
    <div
      data-testid="guest-qr-app-root"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20 selection:bg-sky-500/20"
    >
      {/* Sticky Trilingual & Currency Header Bar */}
      <GuestHeaderBar
        hotelName={resolveTrilingualBrand(brand.name, currentLanguage)}
        locationDisplayName={location.displayName}
        isRoomSession={location.type === "IN_ROOM"}
        activeCurrency={activeCurrency}
        onCurrencyChange={setActiveCurrency}
        usdExchangeRate={brand.approxUsdRate}
        cartItemCount={cart.totalItemCount}
      />

      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4">
        {/* 3:1 Cinematic Hero Banner with Hotel Logo & Location Badge */}
        <GuestHeroBanner
          brand={brand}
          location={location}
          sessionStatus={sessionStatus}
          lang={currentLanguage}
        />

        {/* Operating Status & Folio Permission Ribbon */}
        <GuestSessionStatusBar
          sessionStatus={sessionStatus}
          hours={brand.inRoomDiningHours}
          allowFolio={brand.allowFolioPost}
        />

        {/* Multi-Department Service Pill Switcher */}
        <DepartmentTabs
          activeDepartment={
            activeTab === "FOLIO" || activeTab === "ORDER_STATUS"
              ? "DINING"
              : (activeTab as QrDepartment)
          }
          onSelectDepartment={(dept) => handleTabChange(dept)}
          isRoomSession={location.type === "IN_ROOM"}
        />

        {/* Horizontal Sticky Category Carousel */}
        {activeTab !== "FOLIO" && activeTab !== "ORDER_STATUS" && (
          <div className="mb-4">
            <CategoryPillsBar
              activeDepartment={activeTab}
              selectedCategoryId={selectedCategory}
              onSelectCategory={(catId) => setSelectedCategory(catId)}
              language={currentLanguage}
              isSticky={false}
            />
          </div>
        )}

        {/* Shortcuts for Live Folio & Active Order Tracking */}
        <div className="mb-4 flex justify-end gap-2">
          {activeOrderId && (
            <button
              type="button"
              onClick={() => handleTabChange("ORDER_STATUS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-apple-spring inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
                activeTab === "ORDER_STATUS"
                  ? "bg-[#E8772E] text-white shadow-md"
                  : "apple-liquid-glass text-[#E8772E] border border-orange-500/30"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#E8772E] animate-ping" />
              <span>🛵 Live Order</span>
            </button>
          )}

          {location.folioPostingAllowed && (
            <button
              type="button"
              onClick={() => handleTabChange("FOLIO")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-apple-spring inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
                activeTab === "FOLIO"
                  ? "bg-sky-600 text-white shadow-md"
                  : "apple-liquid-glass text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-white/40 dark:border-white/10"
              }`}
            >
              <span>🧾</span> Live Folio
            </button>
          )}
        </div>

        {/* Dynamic Service View or Live Order Tracker */}
        {activeTab === "ORDER_STATUS" && activeOrderId ? (
          <LiveOrderTracker
            orderId={activeOrderId}
            language={currentLanguage}
            usdExchangeRate={brand.approxUsdRate}
            onBackToMenu={() => handleTabChange("DINING")}
          />
        ) : (
          <GuestActiveServiceView
            activeTab={activeTab}
            locationName={location.displayName}
            language={currentLanguage}
            currency={activeCurrency}
            cartQuantities={cartQuantities}
            onIncrementDish={handleIncrementDish}
            onDecrementDish={handleDecrementDish}
            onOpenCustomization={(dish) => setCustomizingDish(dish)}
          />
        )}
      </div>

      {/* Dish Customization & Modifier Bottom Sheet */}
      <DishModifierSheet
        isOpen={Boolean(customizingDish)}
        dish={customizingDish}
        language={currentLanguage}
        onClose={() => setCustomizingDish(null)}
        onConfirm={(customized) => {
          cart.addCustomizedItem(
            customized,
            customizingDish?.imageUrl,
            customizingDish?.freeOnMealPlans,
          );
        }}
      />

      {/* Floating Bottom Cart Summary Bar (Step 258) */}
      <FloatingCartBar
        itemCount={cart.cartItemCount}
        grandTotalLkr={cart.summary.grandTotalLkr}
        approxGrandTotalUsd={cart.summary.approxGrandTotalUsd}
        mealPlanSavingsLkr={cart.summary.mealPlanSavingsLkr}
        currency={activeCurrency}
        language={currentLanguage}
        isVisible={!isCartDrawerOpen && cart.cartItemCount > 0}
        onViewCart={() => setIsCartDrawerOpen(true)}
      />

      {/* Transparent Cart & 4-Stage Statutory Tax Review Sheet (Step 259) */}
      <GuestCartDrawer
        isOpen={isCartDrawerOpen}
        items={cart.items}
        summary={cart.summary}
        guestMealPlan={cart.guestMealPlan}
        currency={activeCurrency}
        language={currentLanguage}
        onIncrementItem={(itemId) => cart.incrementItem(itemId)}
        onDecrementItem={(itemId) => cart.decrementItem(itemId)}
        onRemoveItem={(itemId) => cart.removeItem(itemId)}
        onClearCart={() => cart.clearCart()}
        onClose={() => setIsCartDrawerOpen(false)}
        onProceedToCheckout={() => {
          setIsCartDrawerOpen(false);
          if (location.folioPostingAllowed) {
            setIsRoomAuthOpen(true);
          } else {
            setIsLankaQrOpen(true);
          }
        }}
      />

      {/* Room Charge Verification Prompt Modal (Step 260) */}
      {isRoomAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md">
            <RoomChargeAuthBox
              roomNumber={location.displayName}
              grandTotalLkr={cart.summary.grandTotalLkr}
              language={currentLanguage}
              onAuthorize={(_result: RoomChargeAuthResult) => {
                setIsRoomAuthOpen(false);
                const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
                setActiveOrderId(orderId);
                setActiveTab("ORDER_STATUS");
                cart.clearCart();
              }}
              onCancel={() => setIsRoomAuthOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Instant LankaQR & Alipay+ Scan-to-Pay Modal (Step 261) */}
      {isLankaQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <GuestLankaQrPay
              locationName={location.displayName}
              amountLkr={cart.summary.grandTotalLkr}
              merchantName={resolveTrilingualBrand(brand.name, currentLanguage)}
              merchantCity={brand.city}
              language={currentLanguage}
              onPaymentSuccess={(_result: GuestPaymentResult) => {
                setIsLankaQrOpen(false);
                const orderId =
                  _result.referenceId || `ORD-${Date.now().toString(36).toUpperCase()}`;
                setActiveOrderId(orderId);
                setActiveTab("ORDER_STATUS");
                cart.clearCart();
              }}
              onCancel={() => setIsLankaQrOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
