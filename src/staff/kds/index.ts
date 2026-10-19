/**
 * Kitchen Display System (KDS) Module Entrypoint.
 */

export {
  KdsKanbanView,
  DEFAULT_KDS_TICKETS,
  formatElapsedTimer,
  calculateSlaUrgency,
  getSlaBadgeTheme,
  getOrderTypeDetails,
  getNextOrderStatus,
  getPrevOrderStatus,
  getAdvanceButtonText,
  filterKdsTickets,
  type KdsOrderStatus,
  type KdsOrderType,
  type KdsSlaUrgency,
  type KdsKanbanFilter,
  type KdsOrderItem,
  type KdsTicket,
  type KdsKanbanViewProps,
} from "./KdsKanbanView.js";

export {
  KdsTicketCard,
  evaluateTicketSlaUrgency,
  getDietaryBadgeClass,
  getDishSubtitle,
  type KdsTicketCardProps,
  type TicketSlaDetails,
} from "./KdsTicketCard.js";

export {
  KdsMobileCompact,
  getTabLabel,
  type KdsMobileTab,
  type KdsMobileCompactProps,
} from "./KdsMobileCompact.js";

export {
  BarBotView,
  DEFAULT_BAR_TICKETS,
  getBarDestinationMeta,
  getBarAdvanceButtonText,
  filterBarTickets,
  type BarDestinationType,
  type BarBeverageCategory,
  type BarOrderItem,
  type BarTicket,
  type BarBotViewProps,
} from "./BarBotView.js";

export {
  PrintableKotSlip,
  formatKotTimestamp,
  computeTotalItemCount,
  getSlipTitle,
  type SlipTicketType,
  type KotPrintableItem,
  type PrintableKotSlipProps,
} from "./PrintableKotSlip.js";
