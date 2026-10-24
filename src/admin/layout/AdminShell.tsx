/**
 * Clean Enterprise SaaS Sidebar & Top Toolbar Shell (`src/admin/layout/AdminShell.tsx`).
 * Matches `Version 2.zip` (Screens 03–09, 16–23):
 * - Crisp white 250px left sidebar (`border-r border-slate-200/90`) with 3 clean groups:
 * 1. FRONTLINE & GUESTS
 * 2. DINING, EVENTS & ROOMS
 * 3. BACK OFFICE & STATUTORY
 * - Active nav item uses soft mint background (`bg-[#E6F4EE] text-[#0B6E4F] font-semibold`) with subtle count pills
 * - Clean white top operations bar with Property selector, Mode switcher, centered Quick Jump search (`⌘K`), CBSL rate pill, and trilingual selector
 * - Responsive mobile slide-over drawer for smartphone and tablet viewports
 * - Zero emojis, zero gradients, generous breathing room
 */

import { type FC, type ReactNode, Suspense, lazy, useEffect, useState } from "react";
import { ChevronDownSvgIcon, LeafLogoIcon, SearchSvgIcon } from "../../components/SvgIcons.js";
import {
  type StaffRole,
  type StaffShiftSession,
  getCurrentShiftSession,
  hasRolePermission,
  logoutStaff,
} from "../../lib/auth.js";
import { getStoredHotelProfile, subscribeToHotelProfile } from "../../lib/hotelProfile.js";
import { useTranslation } from "../../lib/i18n.js";
import { navigateTo } from "../../lib/router.js";

// ============================================================================
// Lazy Chunk Module Registry (Step 471)
// ============================================================================

export const LazyDashboardView = lazy(() =>
  import("../DashboardView.js").then((m) => ({ default: m.DashboardView })),
);
export const LazyFrontDeskPage = lazy(() =>
  import("../frontdesk/FrontDeskPage.js").then((m) => ({ default: m.FrontDeskPage })),
);
export const LazyChannelsAndDirectPage = lazy(() =>
  import("../channels/ChannelsAndDirectPage.js").then((m) => ({
    default: m.ChannelsAndDirectPage,
  })),
);
export const LazyAllOrdersView = lazy(() =>
  import("../orders/AllOrdersView.js").then((m) => ({ default: m.AllOrdersView })),
);
export const LazyMenusAndCatalogPage = lazy(() =>
  import("../menus/MenusAndCatalogPage.js").then((m) => ({
    default: m.MenusAndCatalogPage,
  })),
);
export const LazyFoliosAndBillingPage = lazy(() =>
  import("../folios/FoliosAndBillingPage.js").then((m) => ({
    default: m.FoliosAndBillingPage,
  })),
);
export const LazyHousekeepingAdminPage = lazy(() =>
  import("../housekeeping/HousekeepingAdminPage.js").then((m) => ({
    default: m.HousekeepingAdminPage,
  })),
);
export const LazyBanquetsAdminPage = lazy(() =>
  import("../banquets/BanquetsAdminPage.js").then((m) => ({
    default: m.BanquetsAdminPage,
  })),
);
export const LazyActivitiesAdminPage = lazy(() =>
  import("../activities/ActivitiesAdminPage.js").then((m) => ({
    default: m.ActivitiesAdminPage,
  })),
);
export const LazyInventoryAdminPage = lazy(() =>
  import("../inventory/InventoryAdminPage.js").then((m) => ({
    default: m.InventoryAdminPage,
  })),
);
export const LazyReportsAdminPage = lazy(() =>
  import("../reports/ReportsAdminPage.js").then((m) => ({
    default: m.ReportsAdminPage,
  })),
);
export const LazyRoomsAndRatesPage = lazy(() =>
  import("../rooms/RoomsAndRatesPage.js").then((m) => ({ default: m.RoomsAndRatesPage })),
);
export const LazyHrAndPayrollPage = lazy(() =>
  import("../hr/HrAndPayrollPage.js").then((m) => ({ default: m.HrAndPayrollPage })),
);
export const LazySettingsPage = lazy(() =>
  import("../settings/SettingsPage.js").then((m) => ({ default: m.SettingsPage })),
);
export const LazySaasSuperAdminView = lazy(() =>
  import("../superadmin/SaasSuperAdminView.js").then((m) => ({
    default: m.SaasSuperAdminView,
  })),
);

export const ADMIN_MODULE_REGISTRY = {
  dashboard: LazyDashboardView,
  "front-desk": LazyFrontDeskPage,
  rooms: LazyRoomsAndRatesPage,
  channels: LazyChannelsAndDirectPage,
  orders: LazyAllOrdersView,
  kds: LazyAllOrdersView,
  menus: LazyMenusAndCatalogPage,
  folios: LazyFoliosAndBillingPage,
  housekeeping: LazyHousekeepingAdminPage,
  banquets: LazyBanquetsAdminPage,
  spa: LazyActivitiesAdminPage,
  stores: LazyInventoryAdminPage,
  tax: LazyReportsAdminPage,
  reports: LazyReportsAdminPage,
  audit: LazyReportsAdminPage,
  payroll: LazyHrAndPayrollPage,
  settings: LazySettingsPage,
  saas: LazySaasSuperAdminView,
} as const;

// ============================================================================
// Types & Navigation Contract
// ============================================================================

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly iconName: string;
  readonly badgeCount?: number | undefined;
  readonly requiredPermission?: string | undefined;
  readonly allowedRoles?: ReadonlyArray<StaffRole> | undefined;
}

export interface HotelPropertyOption {
  readonly id: string;
  readonly name: string;
  readonly city: string;
}

export interface AdminShellProps {
  readonly currentModule?: string | undefined;
  readonly subModule?: string | undefined;
  readonly userRole?: StaffRole | undefined;
  readonly staffName?: string | undefined;
  readonly activeTenantName?: string | undefined;
  readonly properties?: ReadonlyArray<HotelPropertyOption> | undefined;
  readonly onPropertyChange?: ((propertyId: string) => void) | undefined;
  readonly onOpenSpotlight?: (() => void) | undefined;
  readonly onLogout?: (() => void) | undefined;
  readonly renderLazyModules?: boolean | undefined;
  readonly isLiveSyncing?: boolean | undefined;
  readonly onOrderAction?: ((orderId: string, action: string) => void) | undefined;
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
  readonly children?: ReactNode | undefined;
}

export const ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin/dashboard",
    iconName: "chart-bar",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  },
  {
    id: "front-desk",
    label: "Front Desk & Tape Chart",
    path: "/admin/front-desk",
    iconName: "calendar",
    badgeCount: 8,
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  },
  {
    id: "channels",
    label: "Channels & Direct",
    path: "/admin/channels",
    iconName: "globe",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "folios",
    label: "Folios & Cashier",
    path: "/admin/folios",
    iconName: "credit-card",
    badgeCount: 3,
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "POS_CASHIER"],
  },
  {
    id: "kds",
    label: "All Orders & POS / KDS",
    path: "/admin/orders",
    iconName: "fire",
    badgeCount: 5,
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "KITCHEN_KDS", "POS_CASHIER"],
  },
  {
    id: "menus",
    label: "Menus & Outlets",
    path: "/admin/menus",
    iconName: "book-open",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "housekeeping",
    label: "Housekeeping & Engineering",
    path: "/admin/housekeeping",
    iconName: "sparkles",
    badgeCount: 2,
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING"],
  },
  {
    id: "banquets",
    label: "Banquets & Weddings",
    path: "/admin/banquets",
    iconName: "user-group",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  },
  {
    id: "spa",
    label: "Spa & Excursions",
    path: "/admin/spa",
    iconName: "heart",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  },
  {
    id: "stores",
    label: "Stores & Procurement",
    path: "/admin/stores",
    iconName: "cube",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "tax",
    label: "SLTDA & IRD Tax",
    path: "/admin/tax",
    iconName: "receipt-tax",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "payroll",
    label: "HR & EPF/ETF Payroll",
    path: "/admin/payroll",
    iconName: "identification",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "audit",
    label: "Audit Logs",
    path: "/admin/audit",
    iconName: "shield-check",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "settings",
    label: "Settings",
    path: "/admin/settings",
    iconName: "cog",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN"],
  },
  {
    id: "saas",
    label: "SaaS Super-Admin",
    path: "/admin/saas",
    iconName: "building-office",
    allowedRoles: ["SUPER_ADMIN"],
  },
];

export const DEFAULT_PROPERTIES: ReadonlyArray<HotelPropertyOption> = [
  { id: "tenant-galle-fort", name: "Galle Fort Lighthouse Villa", city: "Galle" },
  { id: "tenant-kandy-hills", name: "Kandy Mountain Bungalow", city: "Kandy" },
  { id: "tenant-mirissa-bay", name: "Mirissa Ocean Retreat", city: "Mirissa" },
];

/**
 * Filters the master navigation tree according to staff user RBAC role.
 */
export function filterNavItemsForRole(
  items: ReadonlyArray<NavItem>,
  role: StaffRole,
): ReadonlyArray<NavItem> {
  if (role === "SUPER_ADMIN") return items;

  return items.filter((item) => {
    if (item.allowedRoles && !item.allowedRoles.includes(role)) {
      return false;
    }
    if (item.requiredPermission && !hasRolePermission(role, item.requiredPermission)) {
      return false;
    }
    return true;
  });
}

// ============================================================================
// Crisp 1.75px Vector Sidebar Icons
// ============================================================================

function ChartBarIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={1.8} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={1.8} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={1.8} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={1.8} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 3v18m-4-14v4a4 4 0 008 0V7M5 3v4a2 2 0 002 2h10a2 2 0 002-2V3"
      />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M8 9h8M8 13h6" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 3l2.2 6.6L21 12l-6.8 2.4L12 21l-2.2-6.6L3 12l6.8-2.4L12 3z"
      />
    </svg>
  );
}

function UserGroupIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 18h18M5 18l-1-9 5 4 3-6 3 6 5-4-1 9"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 21c-4.5-2.5-7.5-6-7.5-10A4.5 4.5 0 0112 7.5 4.5 4.5 0 0119.5 11c0 4-3 7.5-7.5 10z"
      />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function ReceiptTaxIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 21h18M4 18h16M6 18v-7m4 7v-7m4 7v-7m4 7v-7M12 3l9 5H3l9-5z"
      />
    </svg>
  );
}

function IdentificationIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function BuildingOfficeIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function DefaultNavIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 6h16M4 12h16M4 18h7"
      />
    </svg>
  );
}

const ICON_COMPONENTS: Record<string, FC> = {
  "chart-bar": ChartBarIcon,
  calendar: CalendarIcon,
  globe: GlobeIcon,
  "credit-card": CreditCardIcon,
  fire: FireIcon,
  "book-open": BookOpenIcon,
  sparkles: SparklesIcon,
  "user-group": UserGroupIcon,
  heart: HeartIcon,
  cube: CubeIcon,
  "receipt-tax": ReceiptTaxIcon,
  identification: IdentificationIcon,
  "shield-check": ShieldCheckIcon,
  cog: CogIcon,
  "building-office": BuildingOfficeIcon,
};

function NavItemIcon({ iconName }: { readonly iconName: string }) {
  const IconComp = ICON_COMPONENTS[iconName] ?? DefaultNavIcon;
  return <IconComp />;
}

function isNavItemActive(itemId: string, currentModule: string): boolean {
  if (currentModule === itemId) return true;
  if (itemId === "kds") return currentModule === "orders";
  if (itemId === "menus") return currentModule === "menu";
  return false;
}

interface NavGroupItemProps {
  readonly item: NavItem;
  readonly isActive: boolean;
  readonly onNavigate: (path: string) => void;
}

function NavGroupItem({ item, isActive, onNavigate }: NavGroupItemProps) {
  const displayLabel = item.id === "audit" ? "Audit Logs & Cloud" : item.label;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`w-full min-h-[38px] flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
        isActive
          ? "bg-[#E6F4EE] text-[#0B6E4F] font-semibold"
          : "text-slate-600 hover:bg-slate-50 font-medium"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={isActive ? "text-[#0B6E4F] " : "text-slate-400 "}>
          <NavItemIcon iconName={item.iconName} />
        </span>
        <span className="truncate">{displayLabel}</span>
      </div>
      {item.badgeCount !== undefined && (
        <span
          className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums-lkr shrink-0 ${
            isActive ? "bg-white/90 text-[#0B6E4F] " : "bg-slate-100 text-slate-500 "
          }`}
        >
          {item.badgeCount}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Fallback & Dynamic Module Renderer
// ============================================================================

export function AdminModuleFallback() {
  return (
    <div
      data-testid="admin-module-skeleton"
      className="p-8 flex flex-col items-center justify-center min-h-[300px] apple-liquid-glass rounded-2xl animate-pulse"
    >
      <div className="w-8 h-8 rounded-full border-2 border-[#0B6E4F] border-t-transparent animate-spin mb-3" />
      <span className="text-xs font-semibold text-slate-500 ">Loading module...</span>
    </div>
  );
}

export interface AdminModuleViewProps {
  readonly propertyTitle?: string | undefined;
  readonly isLiveSyncing?: boolean | undefined;
  readonly onOrderAction?: ((orderId: string, action: string) => void) | undefined;
  readonly onSaveSuccess?: ((section: string) => void) | undefined;
  readonly subModule?: string | undefined;
}

function resolveSettingsInitialTab(
  subModule?: string,
): "PROFILE" | "TAXES" | "PAYMENTS" | "SMS" | "STAFF" | "BILLING" {
  const sub = subModule?.toUpperCase();
  if (sub === "TAXES" || sub === "TAX") return "TAXES";
  if (sub === "PAYMENTS" || sub === "PAYMENT") return "PAYMENTS";
  if (sub === "SMS") return "SMS";
  if (sub === "STAFF" || sub === "ROSTER") return "STAFF";
  if (sub === "BILLING" || sub === "SAAS") return "BILLING";
  return "PROFILE";
}

export function renderAdminModuleView(
  module: string,
  extraProps?: AdminModuleViewProps,
): ReactNode {
  switch (module) {
    case "dashboard":
      return (
        <LazyDashboardView
          propertyTitle={extraProps?.propertyTitle ?? "Galle Fort Lighthouse Villa"}
          isLiveSyncing={extraProps?.isLiveSyncing ?? true}
          onOrderAction={extraProps?.onOrderAction}
        />
      );
    case "front-desk":
      return <LazyFrontDeskPage hotelName={extraProps?.propertyTitle} />;
    case "rooms":
    case "room":
      return <LazyRoomsAndRatesPage propertyTitle={extraProps?.propertyTitle} />;
    case "channels":
      return <LazyChannelsAndDirectPage hotelName={extraProps?.propertyTitle} />;
    case "orders":
    case "kds":
      return <LazyAllOrdersView />;
    case "menu":
    case "menus":
      return <LazyMenusAndCatalogPage />;
    case "billing":
    case "folios":
      return <LazyFoliosAndBillingPage />;
    case "housekeeping":
      return <LazyHousekeepingAdminPage />;
    case "banquets":
      return <LazyBanquetsAdminPage />;
    case "spa":
      return <LazyActivitiesAdminPage />;
    case "inventory":
    case "stores":
      return <LazyInventoryAdminPage />;
    case "tax":
      return (
        <LazyReportsAdminPage initialTab="SLTDA_OCCUPANCY" hotelName={extraProps?.propertyTitle} />
      );
    case "night-audit":
    case "audit":
      return (
        <LazyReportsAdminPage initialTab="SECURITY_AUDIT" hotelName={extraProps?.propertyTitle} />
      );
    case "reports":
      return <LazyReportsAdminPage initialTab="GM_FLASH" hotelName={extraProps?.propertyTitle} />;
    case "payroll":
      return <LazyHrAndPayrollPage />;
    case "settings": {
      const initialTab = resolveSettingsInitialTab(extraProps?.subModule);
      return (
        <LazySettingsPage
          initialTab={initialTab}
          propertyTitle={extraProps?.propertyTitle}
          onSaveSuccess={extraProps?.onSaveSuccess}
        />
      );
    }
    case "super-admin":
    case "saas":
      return <LazySaasSuperAdminView currentUserRole="SUPER_ADMIN" />;
    default:
      return (
        <LazyDashboardView
          propertyTitle={extraProps?.propertyTitle ?? "Galle Fort Lighthouse Villa"}
          isLiveSyncing={extraProps?.isLiveSyncing ?? true}
          onOrderAction={extraProps?.onOrderAction}
        />
      );
  }
}

// ============================================================================
// Sidebar Content Component (Version 2 Clean White Left Navigation)
// ============================================================================

interface SidebarContentProps {
  readonly navItems: ReadonlyArray<NavItem>;
  readonly currentModule: string;
  readonly staffName: string;
  readonly userRole: StaffRole;
  readonly shiftSession: StaffShiftSession | null;
  readonly hotelLogoUrl?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly onNavigate: (path: string) => void;
  readonly onLogout: () => void;
}

const NAV_GROUPS: ReadonlyArray<{
  readonly id: string;
  readonly title: string;
  readonly itemIds: ReadonlyArray<string>;
}> = [
  {
    id: "frontline",
    title: "FRONTLINE & GUESTS",
    itemIds: ["dashboard", "front-desk", "channels", "folios", "rooms"],
  },
  {
    id: "dining",
    title: "DINING, EVENTS & ROOMS",
    itemIds: ["kds", "menus", "housekeeping", "banquets", "spa"],
  },
  {
    id: "backoffice",
    title: "BACK OFFICE & STATUTORY",
    itemIds: ["stores", "tax", "payroll", "audit", "settings", "saas"],
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "KP";
}

function SidebarContent({
  navItems,
  currentModule,
  staffName,
  userRole,
  shiftSession,
  hotelLogoUrl,
  hotelName,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full min-h-0 justify-between bg-white text-slate-700 ">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Top Brand Identity */}
        <button
          type="button"
          onClick={() => onNavigate("/portal")}
          className="px-4 py-4 flex items-center gap-3 border-b border-slate-100 shrink-0 w-full text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {hotelLogoUrl ? (
            <img
              src={hotelLogoUrl}
              alt={hotelName ?? "Hotel Logo"}
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#0B6E4F] flex items-center justify-center text-white shrink-0">
              <LeafLogoIcon size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight truncate">
              Sri Lanka HMS
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              {hotelName || "Galle Fort Lighthouse Villa"}
            </span>
          </div>
        </button>

        {/* Categorized Navigation Groups */}
        <nav
          aria-label="PMS Admin Navigation"
          className="px-3 py-4 space-y-5 overflow-y-auto flex-1 min-h-0"
        >
          {NAV_GROUPS.map((group) => {
            const groupItems = navItems.filter((i) => group.itemIds.includes(i.id));
            if (groupItems.length === 0) return null;
            return (
              <div key={group.id} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
                  {group.title}
                </div>
                {groupItems.map((item) => (
                  <NavGroupItem
                    key={item.id}
                    item={item}
                    isActive={isNavItemActive(item.id, currentModule)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Staff Profile Footer */}
      <div className="p-3.5 border-t border-slate-100 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#E6F4EE] text-[#0B6E4F] font-bold text-xs flex items-center justify-center shrink-0">
              {getInitials(staffName)}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-slate-900 truncate">{staffName}</span>
              <span className="block text-[10px] text-slate-500 truncate">{userRole} • Active</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Click to sign out"
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0] hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
          >
            {shiftSession ? "On Duty" : "On Duty"}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveModeUrl(target: string, selectedProperty: string): string | null {
  const modeRoutes: Record<string, string> = {
    admin: "/admin",
    pos: "/staff/pos",
    kds: "/staff/kds",
    bar: "/staff/bar",
    staff: "/staff",
    qr: `/qr/${selectedProperty}/room-104`,
    booking: `/book/${selectedProperty}`,
  };
  return modeRoutes[target] ?? null;
}

interface TrilingualHeaderSwitchProps {
  readonly currentLanguage: "en" | "si" | "ta";
  readonly onSelectLanguage: (lang: "en" | "si" | "ta") => void;
}

function TrilingualHeaderSwitch({
  currentLanguage,
  onSelectLanguage,
}: TrilingualHeaderSwitchProps) {
  return (
    <nav
      aria-label="Language Selector"
      className="hidden md:flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-medium"
    >
      <button
        type="button"
        onClick={() => onSelectLanguage("en")}
        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
          currentLanguage === "en"
            ? "bg-white text-slate-900 font-semibold shadow-2xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onSelectLanguage("si")}
        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
          currentLanguage === "si"
            ? "bg-white text-slate-900 font-semibold shadow-2xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="සිංහල"
      >
        සිංහල
      </button>
      <button
        type="button"
        onClick={() => onSelectLanguage("ta")}
        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
          currentLanguage === "ta"
            ? "bg-white text-slate-900 font-semibold shadow-2xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="தமிழ்"
      >
        தமிழ்
      </button>
    </nav>
  );
}

// ============================================================================
// Main AdminShell Component
// ============================================================================

export function AdminShell({
  currentModule = "dashboard",
  subModule,
  userRole = "HOTEL_ADMIN",
  staffName = "Kasun Perera",
  activeTenantName = "Galle Fort Lighthouse Villa",
  properties = DEFAULT_PROPERTIES,
  onPropertyChange,
  onOpenSpotlight,
  onLogout,
  onSaveSuccess,
  renderLazyModules = false,
  isLiveSyncing = true,
  onOrderAction,
  children,
}: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hms_theme") === "dark";
    }
    return false;
  });
  const [selectedProperty, setSelectedProperty] = useState(properties[0]?.id ?? "");
  const [hotelProfile, setHotelProfile] = useState(() => getStoredHotelProfile());
  const { currentLanguage, setLanguage } = useTranslation();

  useEffect(() => {
    return subscribeToHotelProfile((profile) => {
      setHotelProfile(profile);
    });
  }, []);

  const shiftSession = getCurrentShiftSession();
  const visibleNavItems = filterNavItemsForRole(ADMIN_NAV_ITEMS, userRole);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("hms_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("hms_theme", "light");
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (onOpenSpotlight) onOpenSpotlight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenSpotlight]);

  const toggleAppearance = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    setIsMobileMenuOpen(false);
    navigateTo(path);
  };

  const handleLogoutAction = () => {
    logoutStaff();
    if (onLogout) onLogout();
    else navigateTo("/login");
  };

  const handlePropertySelect = (propertyId: string) => {
    setSelectedProperty(propertyId);
    if (onPropertyChange) onPropertyChange(propertyId);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F4F7F5] font-sf-pro antialiased">
      {/* Desktop Clean White Left Sidebar */}
      <aside
        aria-label="Desktop Navigation Sidebar"
        className="hidden lg:flex flex-col w-[248px] shrink-0 bg-white border-r border-slate-200/90 h-screen sticky top-0 z-30 justify-between overflow-hidden"
      >
        <SidebarContent
          navItems={visibleNavItems}
          currentModule={currentModule}
          staffName={staffName}
          userRole={userRole}
          shiftSession={shiftSession}
          hotelLogoUrl={hotelProfile.logoUrl}
          hotelName={hotelProfile.shopName || activeTenantName}
          onNavigate={handleNavigate}
          onLogout={handleLogoutAction}
        />
      </aside>

      {/* Mobile/Tablet Slide-Over Navigation Drawer */}
      {isMobileMenuOpen && (
        <dialog
          open
          aria-label="Mobile Navigation Drawer"
          className="fixed inset-0 z-50 lg:hidden flex bg-transparent p-0 m-0 border-0 max-w-none max-h-none w-full h-full"
        >
          <div
            role="presentation"
            onClick={() => setIsMobileMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsMobileMenuOpen(false);
            }}
            className="fixed inset-0 bg-white transition-opacity cursor-pointer"
          />
          <div className="relative w-[260px] max-w-xs h-full bg-white shadow-xl z-10 flex flex-col">
            <SidebarContent
              navItems={visibleNavItems}
              currentModule={currentModule}
              staffName={staffName}
              userRole={userRole}
              shiftSession={shiftSession}
              hotelLogoUrl={hotelProfile.logoUrl}
              hotelName={hotelProfile.shopName || activeTenantName}
              onNavigate={handleNavigate}
              onLogout={handleLogoutAction}
            />
          </div>
        </dialog>
      )}

      {/* Right Column: Top Operations Header + Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Operations Header Bar */}
        <header
          aria-label="Top Operations Toolbar"
          className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-20"
        >
          {/* Left: Mobile Menu Button + Property Dropdown + Mode Switcher */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="lg:hidden min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Property Selector */}
            <div className="relative hidden sm:block">
              <select
                aria-label="Select Active Hotel Property"
                value={selectedProperty}
                onChange={(e) => handlePropertySelect(e.target.value)}
                className="min-h-[36px] pl-3.5 pr-8 py-1.5 rounded-xl bg-slate-50 text-slate-800 font-medium text-xs border border-slate-200 appearance-none focus:outline-none cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city})
                  </option>
                ))}
              </select>
              <ChevronDownSvgIcon
                size={13}
                className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              />
            </div>

            {/* Mode Switcher */}
            <div className="relative">
              <select
                aria-label="Switch Platform Application"
                defaultValue="admin"
                onChange={(e) => {
                  const target = e.target.value;
                  if (target === "portal") {
                    navigateTo("/portal");
                  } else {
                    const url = resolveModeUrl(target, selectedProperty);
                    if (url) navigateTo(url);
                  }
                }}
                className="min-h-[36px] pl-3 pr-7 py-1.5 rounded-xl bg-[#ECFDF5] text-[#0B6E4F] font-semibold text-xs border border-[#A7F3D0] appearance-none focus:outline-none cursor-pointer"
              >
                <option value="admin">Mode: Hotel PMS Admin</option>
                <option value="portal">Mode: Launch Portal</option>
                <option value="pos">Mode: Restaurant Waiter POS</option>
                <option value="kds">Mode: Kitchen KDS Screen</option>
                <option value="bar">Mode: Bar BOT Screen</option>
                <option value="staff">Mode: Staff Operations Hub</option>
                <option value="qr">Mode: Guest Room QR Menu</option>
                <option value="booking">Mode: Public Booking Engine</option>
              </select>
              <ChevronDownSvgIcon
                size={13}
                className="w-3.5 h-3.5 text-[#0B6E4F] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          {/* Center: Quick Jump Search Box (⌘K) */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-auto hidden md:block">
            <div className="relative w-full">
              <SearchSvgIcon
                size={14}
                className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Quick Jump rooms, guests, folios..."
                onClick={onOpenSpotlight}
                readOnly
                className="w-full min-h-[36px] pl-9 pr-12 py-1.5 text-xs rounded-full bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 cursor-pointer focus:outline-none"
              />
              <button
                type="button"
                onClick={onOpenSpotlight}
                aria-label="Open Spotlight Command Palette (⌘K)"
                className="absolute inset-y-1 right-1.5 px-2 flex items-center text-[10px] font-semibold text-slate-500 bg-white rounded-full border border-slate-200 cursor-pointer"
              >
                <kbd className="font-mono">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Right: CBSL Rate Pill + Language Switcher + Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:flex items-center px-3 py-1.5 min-h-[34px] rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 tabular-nums-lkr">
              CBSL: 1 USD = LKR 298.50
            </div>

            <TrilingualHeaderSwitch
              currentLanguage={currentLanguage}
              onSelectLanguage={setLanguage}
            />

            <button
              type="button"
              onClick={toggleAppearance}
              aria-label="Toggle Dark/Light Appearance"
              className="min-h-[34px] min-w-[34px] p-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
            >
              {isDarkMode ? (
                <svg
                  className="w-4 h-4 text-amber-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-slate-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children ? (
            children
          ) : renderLazyModules ? (
            <Suspense fallback={<AdminModuleFallback />}>
              {renderAdminModuleView(currentModule, {
                propertyTitle: hotelProfile.shopName || activeTenantName,
                isLiveSyncing,
                onOrderAction,
                onSaveSuccess,
                subModule,
              })}
            </Suspense>
          ) : (
            <div className="p-8 text-center text-slate-500 ">
              <h2 className="text-xl font-bold text-slate-800 ">{activeTenantName}</h2>
              <p className="mt-1 text-sm">
                Active Module: <span className="font-semibold text-[#0B6E4F]">{currentModule}</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
