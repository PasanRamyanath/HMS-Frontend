/**
 * @hms/frontend - Contactless Guest QR Mobile Web App Barrel (src/qr/index.ts)
 *
 * Provides optimized exports for the ultra-fast guest QR ordering experience.
 * Optimized for sub-second 3G load on entry-level Android & iOS devices across Sri Lankan resorts.
 * Guarantees zero admin code in the guest QR bundle chunk (isolated via vite.config.ts manualChunks).
 *
 * Architectural Guarantees:
 * 1. Apple Human Interface Guidelines & Liquid Glass material design tokens.
 * 2. All images strictly enforce loading="lazy" and decoding="async".
 * 3. Tabular numerals (.tabular-nums-lkr) for all LKR/USD pricing and countdown timers.
 * 4. Trilingual (English, සිංහල, தமிழ்) localization throughout.
 * 5. Deterministic client-side 4-stage compounding statutory taxes (SC -> TDL -> SSCL -> VAT).
 */

export {
  GuestQrApp,
  type GuestQrAppProps,
  type LocationType,
  type GuestSessionStatus,
  type GuestLocationInfo,
  type HotelBrandProfile,
  type TrilingualBrandText,
} from "./GuestQrApp.js";

export {
  CallWaiterButton,
  type CallWaiterButtonProps,
  type WaiterCallPayload,
  type WaiterCallType,
  type BillPaymentPreference,
  getCallWaiterStrings,
} from "./CallWaiterButton.js";

export {
  CategoryPillsBar,
  type CategoryPillsBarProps,
  type QrCategoryItem,
  type TrilingualName,
} from "./CategoryPillsBar.js";

export {
  DepartmentTabs,
  type DepartmentTabsProps,
  type QrDepartment,
} from "./DepartmentTabs.js";

export {
  DishModifierSheet,
  type DishModifierSheetProps,
  type ModifierOption,
  type GuestCustomizedDish,
} from "./DishModifierSheet.js";

export {
  ExpiredRoomQrView,
  type ExpiredRoomQrViewProps,
  type ExpiredRoomReason,
} from "./ExpiredRoomQrView.js";

export {
  ExpressHousekeepingTab,
  type ExpressHousekeepingTabProps,
} from "./ExpressHousekeepingTab.js";

export {
  FloatingCartBar,
  type FloatingCartBarProps,
} from "./FloatingCartBar.js";

export {
  GuestCartDrawer,
  type GuestCartDrawerProps,
} from "./GuestCartDrawer.js";

export {
  GuestDishCard,
  type GuestDishCardProps,
  type GuestDish,
  DEFAULT_SAMPLE_DISHES,
} from "./GuestDishCard.js";

export {
  GuestHeaderBar,
  type GuestHeaderBarProps,
  type DisplayCurrency,
} from "./GuestHeaderBar.js";

export {
  GuestLankaQrPay,
  type GuestLankaQrPayProps,
  type GuestPaymentResult,
} from "./GuestLankaQrPay.js";

export {
  GuestLaundryTab,
  type GuestLaundryTabProps,
} from "./GuestLaundryTab.js";

export {
  GuestLiveFolioTab,
  type GuestLiveFolioTabProps,
} from "./GuestLiveFolioTab.js";

export {
  GuestMinibarTab,
  type GuestMinibarTabProps,
} from "./GuestMinibarTab.js";

export {
  HotelInfoSheet,
  type HotelInfoSheetProps,
  type HotelInfoConfig,
  type FacilitySchedule,
  type EmergencyHotline,
  type PropertyRule,
  DEFAULT_HOTEL_INFO,
} from "./HotelInfoSheet.js";

export {
  LiveOrderTracker,
  type LiveOrderTrackerProps,
  type LiveOrderStatus,
  type OrderItemDetail,
  type LiveOrderData,
} from "./LiveOrderTracker.js";

export {
  OrderFeedbackPrompt,
  type OrderFeedbackPromptProps,
  type OrderFeedbackPayload,
} from "./OrderFeedbackPrompt.js";

export {
  PackedMealModal,
  type PackedMealModalProps,
  type PackedMealOrderPayload,
  type SafariDepartureReason,
  type BreakfastPackStyle,
  type PackBeverage,
} from "./PackedMealModal.js";

export {
  GuestSpaAndExcursionsTab,
  type GuestSpaAndExcursionsTabProps,
  type ExperienceCategory,
  type BookingStatus,
  type BreakfastPackOption,
  type ExperienceItem,
  type PricingBreakdown,
  type ExperienceBooking,
  type TabTranslations,
  DEFAULT_EXPERIENCES,
  TAB_TRANSLATIONS,
  getTabTranslations,
  roundLkr,
  isEarlyMorningSlot,
  calculateExperiencePricing,
  getBookingStatusBadgeClass,
} from "./GuestSpaAndExcursionsTab.js";

export {
  RoomChargeAuthBox,
  type RoomChargeAuthBoxProps,
  type RoomChargeAuthResult,
} from "./RoomChargeAuthBox.js";

export {
  useGuestCart,
  guestCartStore,
  type CartItem,
  type TaxRatesConfig,
  type CartTaxSummary,
  type GuestCartState,
} from "./useGuestCart.js";
