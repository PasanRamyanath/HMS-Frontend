/**
 * Staff POS Module Barrel Exports
 */

export {
  PosTerminalView,
  DEFAULT_POS_MENU_ITEMS,
  calculatePosTaxSummary,
  roundRupees,
  formatLkr,
  type PosOrderType,
  type PosItemCategory,
  type PosStation,
  type PosPaymentMethod,
  type PosMenuItem,
  type PosCartItem,
  type PosTaxSummary,
  type PosOrderPayload,
  type PosSettlementPayload,
  type PosTerminalViewProps,
} from "./PosTerminalView.js";

export {
  PosTableMap,
  DEFAULT_RESTAURANT_TABLES,
  computeTableMapSummary,
  filterTablesByZone,
  type TableStatus,
  type RestaurantZone,
  type OrderSource,
  type PosTableData,
  type TableMapSummary,
  type PosTableMapProps,
} from "./PosTableMap.js";

export {
  PosRoomLookupModal,
  DEFAULT_ACTIVE_GUEST_STAYS,
  type MealPlanCode,
  type MealServiceType,
  type GuestStayInfo,
  type PosRoomLookupModalProps,
} from "./PosRoomLookupModal.js";

export {
  PosSplitBillModal,
  calculateEqualSplitBills,
  calculateItemSplitBills,
  calculateSeatSplitBills,
  type SplitMode,
  type SplitSubBill,
  type PosSplitBillModalProps,
} from "./PosSplitBillModal.js";

export {
  PosTenderModal,
  calculateCashChange,
  buildSettlementPayload,
  generateReceiptNumber,
  formatReceiptTimestamp,
  LKR_CASH_DENOMINATIONS,
  SRI_LANKAN_CARD_BANKS,
  type CashCalculationResult,
  type CardTerminalBank,
  type BuildSettlementInput,
  type PosTenderModalProps,
} from "./PosTenderModal.js";

export {
  VoidOrderModal,
  DEFAULT_AUTHORIZED_MANAGERS,
  VOID_REASON_CATALOG,
  getReasonDetails,
  determineInventoryImpact,
  calculateVoidTaxReversal,
  verifyManagerPin,
  validateVoidSubmission,
  processPinKeypress,
  getHeaderBadgeStyle,
  getConfirmButtonStyle,
  getDefaultReasonForAction,
  getConfirmButtonLabel,
  type VoidActionType,
  type VoidReasonCode,
  type InventoryImpactMode,
  type AuthorizedManager,
  type VoidedItemSummary,
  type VoidOrderPayload,
  type VoidOrderModalProps,
  type VoidReasonDetails,
  type VoidModalTranslations,
} from "./VoidOrderModal.js";

export {
  BuffetCheckInView,
  DEFAULT_BUFFET_TARIFFS,
  DEFAULT_BUFFET_RECORDS,
  BUFFET_TRANSLATIONS,
  isMealPlanEntitled,
  computeBuffetAttendanceKpis,
  matchesBuffetQuery,
  matchesBuffetTab,
  filterBuffetRecords,
  calculateBuffetFolioCharge,
  getMealPlanBadgeClass,
  formatBuffetTime,
  type BuffetServicePeriod,
  type BuffetFilterTab,
  type BuffetTariff,
  type BuffetCheckInRecord,
  type BuffetKpis,
  type BuffetCheckInViewProps,
  type BuffetTranslations,
} from "./BuffetCheckInView.js";
