/**
 * macOS/iPadOS-Style Translucent Vibrancy Sidebar & Top Toolbar Shell.
 * Provides role-filtered navigation across 13 core hospitality PMS/ERP modules.
 * Implements Apple HIG Liquid Glass standards with 260px sidebar and ⌘K Spotlight trigger.
 */

import { type ReactNode, useEffect, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge.js";
import {
  type StaffRole,
  type StaffShiftSession,
  getCurrentShiftSession,
  hasRolePermission,
  logoutStaff,
} from "../../lib/auth.js";
import { navigateTo } from "../../lib/router.js";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly iconName: string;
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
  readonly userRole?: StaffRole | undefined;
  readonly staffName?: string | undefined;
  readonly activeTenantName?: string | undefined;
  readonly properties?: ReadonlyArray<HotelPropertyOption> | undefined;
  readonly onPropertyChange?: ((propertyId: string) => void) | undefined;
  readonly onOpenSpotlight?: (() => void) | undefined;
  readonly onLogout?: (() => void) | undefined;
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
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  },
  {
    id: "folios",
    label: "Folios & Cashier",
    path: "/admin/folios",
    iconName: "credit-card",
    allowedRoles: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "POS_CASHIER"],
  },
  {
    id: "kds",
    label: "QR Orders & KDS",
    path: "/admin/kds",
    iconName: "fire",
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

function NavItemIcon({ iconName }: { readonly iconName: string }) {
  switch (iconName) {
    case "chart-bar":
      return (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg
          className="w-5 h-5 shrink-0"
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
    case "credit-card":
      return (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      );
    case "fire":
      return (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          />
        </svg>
      );
    case "sparkles":
      return (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-5 h-5 shrink-0"
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
}

interface SidebarContentProps {
  readonly navItems: ReadonlyArray<NavItem>;
  readonly currentModule: string;
  readonly staffName: string;
  readonly userRole: StaffRole;
  readonly shiftSession: StaffShiftSession | null;
  readonly onNavigate: (path: string) => void;
  readonly onLogout: () => void;
}

function SidebarContent({
  navItems,
  currentModule,
  staffName,
  userRole,
  shiftSession,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* App Title Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-200/50 dark:border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-apple-blue to-apple-teal flex items-center justify-center text-white shadow-md">
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
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">
              Sri Lanka HMS
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              PMS & Operations
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav
          aria-label="PMS Admin Navigation"
          className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]"
        >
          {navItems.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`w-full min-h-[44px] apple-touch-target flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-apple-spring cursor-pointer ${
                  isActive
                    ? "bg-apple-blue text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <NavItemIcon iconName={item.iconName} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Staff User & Shift Session Footer */}
      <div className="p-3 border-t border-slate-200/50 dark:border-white/10 bg-black/5 dark:bg-white/5 m-3 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="truncate">
            <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">
              {staffName}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{userRole}</span>
          </div>
          <StatusBadge
            status={shiftSession ? "CLEAN" : "DIRTY"}
            label={shiftSession ? "On Shift" : "Shift Off"}
            size="sm"
            pulse={Boolean(shiftSession)}
          />
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[36px] apple-touch-target flex items-center justify-center gap-2 rounded-lg text-xs font-medium text-apple-red hover:bg-apple-red/10 transition-apple-spring cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  currentModule = "dashboard",
  userRole = "HOTEL_ADMIN",
  staffName = "Kasun Perera",
  activeTenantName = "Galle Fort Lighthouse Villa",
  properties = DEFAULT_PROPERTIES,
  onPropertyChange,
  onOpenSpotlight,
  onLogout,
  children,
}: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(properties[0]?.id ?? "");

  const shiftSession = getCurrentShiftSession();
  const visibleNavItems = filterNavItemsForRole(ADMIN_NAV_ITEMS, userRole);

  // Global ⌘K Spotlight shortcut listener
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
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextDark);
    }
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
    <div className="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950 font-sf-pro antialiased">
      {/* Desktop macOS-Style 260px Vibrancy Translucent Sidebar */}
      <aside
        aria-label="Desktop Navigation Sidebar"
        className="hidden lg:block w-[260px] h-screen sticky top-0 shrink-0 apple-liquid-glass border-r border-slate-200/60 dark:border-white/10 z-30"
      >
        <SidebarContent
          navItems={visibleNavItems}
          currentModule={currentModule}
          staffName={staffName}
          userRole={userRole}
          shiftSession={shiftSession}
          onNavigate={handleNavigate}
          onLogout={handleLogoutAction}
        />
      </aside>

      {/* Mobile/iPad Slide-Over Drawer Scrim & Drawer */}
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
          />
          <div className="relative w-[280px] max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col">
            <SidebarContent
              navItems={visibleNavItems}
              currentModule={currentModule}
              staffName={staffName}
              userRole={userRole}
              shiftSession={shiftSession}
              onNavigate={handleNavigate}
              onLogout={handleLogoutAction}
            />
          </div>
        </dialog>
      )}

      {/* Main Workspace Area with Top Toolbar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Apple Top Toolbar Shell */}
        <header
          aria-label="Top Operations Toolbar"
          className="sticky top-0 z-20 h-16 apple-liquid-glass border-b border-slate-200/60 dark:border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            {/* Mobile drawer toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="lg:hidden min-h-[44px] min-w-[44px] apple-touch-target p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Property Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 hidden sm:inline">
                Property:
              </span>
              <select
                aria-label="Select Active Hotel Property"
                value={selectedProperty}
                onChange={(e) => handlePropertySelect(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white font-medium text-xs border border-slate-200/60 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-apple-blue cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                    {p.name} ({p.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* ⌘K Spotlight Command Trigger */}
            <button
              type="button"
              onClick={onOpenSpotlight}
              aria-label="Open Spotlight Command Palette (⌘K)"
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/15 transition-apple-spring cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-slate-500"
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
              <span className="hidden md:inline">Quick Jump</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/20 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* Appearance Toggle */}
            <button
              type="button"
              onClick={toggleAppearance}
              aria-label="Toggle Dark/Light Appearance"
              className="min-h-[40px] min-w-[40px] apple-touch-target p-2 rounded-xl bg-black/5 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/15 transition-apple-spring cursor-pointer flex items-center justify-center"
            >
              {isDarkMode ? (
                <svg
                  className="w-4 h-4 text-apple-amber"
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
                  className="w-4 h-4 text-slate-700"
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

        {/* Dynamic Children Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children ?? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {activeTenantName}
              </h2>
              <p className="mt-1 text-sm">
                Active Module:{" "}
                <span className="font-semibold text-apple-blue">{currentModule}</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
