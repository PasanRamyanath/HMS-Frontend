import { useEffect, useState } from "react";
import { DEMO_TENANT_ID } from "../lib/demoSandboxSeeder.js";

export type SimulatorRole =
  | "GUEST_QR"
  | "KITCHEN_KDS"
  | "WAITER_POS"
  | "HOUSEKEEPING_RUNNER"
  | "HOTEL_GM_ADMIN"
  | "SUPER_ADMIN";

export interface SimulatorRoleConfig {
  readonly id: SimulatorRole;
  readonly title: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly defaultRoute: string;
  readonly staffName: string;
  readonly badgeColor: string;
  readonly hotkey: string;
}

export interface RoleSimulatorBarProps {
  readonly currentRole: SimulatorRole;
  readonly onRoleChange: (role: SimulatorRole, targetRoute: string) => void;
  readonly onResetDemoData?: (() => void) | undefined;
  readonly isCollapsedDefault?: boolean | undefined;
  readonly className?: string | undefined;
}

export const SIMULATOR_ROLES: readonly SimulatorRoleConfig[] = [
  {
    id: "GUEST_QR",
    title: "Guest QR (Room 104)",
    shortLabel: "QR",
    description: "Contactless In-Room Dining PWA & LankaQR Folio",
    defaultRoute: `/qr/${DEMO_TENANT_ID}/104`,
    staffName: "Kasun Perera (Guest)",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    hotkey: "⌥1",
  },
  {
    id: "KITCHEN_KDS",
    title: "Kitchen KDS",
    shortLabel: "KDS",
    description: "Chef Kitchen Display System & Ticket Bumping",
    defaultRoute: "/staff/kds",
    staffName: "Nuwan Kumara (Executive Chef)",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    hotkey: "⌥2",
  },
  {
    id: "WAITER_POS",
    title: "Waiter POS",
    shortLabel: "POS",
    description: "Restaurant & Ocean Terrace Table Ordering Terminal",
    defaultRoute: "/staff/pos",
    staffName: "Dinesh Fernando (Captain Waiter)",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    hotkey: "⌥3",
  },
  {
    id: "HOUSEKEEPING_RUNNER",
    title: "Housekeeping",
    shortLabel: "HK",
    description: "Attendant Mobile Room Turnaround & Inspection",
    defaultRoute: "/staff/housekeeping",
    staffName: "Sanduni Silva (Floor Attendant)",
    badgeColor: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    hotkey: "⌥4",
  },
  {
    id: "HOTEL_GM_ADMIN",
    title: "Hotel GM Admin",
    shortLabel: "GM",
    description: "Full PMS, Tape Chart, Folios & Night Audit",
    defaultRoute: "/admin/dashboard",
    staffName: "Pasan Ramyanath (General Manager)",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    hotkey: "⌥5",
  },
  {
    id: "SUPER_ADMIN",
    title: "Super Admin",
    shortLabel: "SA",
    description: "Multi-Property Chain Directory & Cloud SaaS Quota",
    defaultRoute: "/admin/super-admin",
    staffName: "Platform Super-Admin",
    badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    hotkey: "⌥6",
  },
];

export function getSimulatorRoleConfig(role: SimulatorRole): SimulatorRoleConfig {
  const found = SIMULATOR_ROLES.find((r) => r.id === role);
  if (found) {
    return found;
  }
  return SIMULATOR_ROLES[0] as SimulatorRoleConfig;
}

interface RoleButtonProps {
  readonly config: SimulatorRoleConfig;
  readonly isSelected: boolean;
  readonly onClick: () => void;
}

function RoleButton({ config, isSelected, onClick }: RoleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${config.title}`}
      aria-pressed={isSelected}
      className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 text-xs font-semibold select-none ${
        isSelected
          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
          : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
      }`}
    >
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
          isSelected ? "bg-white/20 text-white border-white/30" : config.badgeColor
        }`}
      >
        {config.shortLabel}
      </span>
      <span className="hidden sm:inline truncate">{config.title}</span>
      <kbd
        className={`hidden md:inline-flex text-[9px] px-1 py-0.2 rounded font-mono ${
          isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-500"
        }`}
      >
        {config.hotkey}
      </kbd>
    </button>
  );
}

export function RoleSimulatorBar({
  currentRole,
  onRoleChange,
  onResetDemoData,
  isCollapsedDefault = false,
  className = "",
}: RoleSimulatorBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(isCollapsedDefault);
  const activeConfig = getSimulatorRoleConfig(currentRole);

  // Optional Alt+1 .. Alt+6 keyboard hotkeys for swift role switching during demos
  useEffect(() => {
    const handleHotkeys = (e: globalThis.KeyboardEvent) => {
      if (!e.altKey) return;

      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= SIMULATOR_ROLES.length) {
        e.preventDefault();
        const target = SIMULATOR_ROLES[num - 1];
        if (target) {
          onRoleChange(target.id, target.defaultRoute);
        }
      }
    };

    window.addEventListener("keydown", handleHotkeys);
    return () => window.removeEventListener("keydown", handleHotkeys);
  }, [onRoleChange]);

  const handleSelectRole = (config: SimulatorRoleConfig) => {
    onRoleChange(config.id, config.defaultRoute);
  };

  if (isCollapsed) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 ${className}`.trim()}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          aria-label="Expand Demo Role Simulator Bar"
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 apple-liquid-glass rounded-full shadow-lg border border-white/40 dark:border-white/15 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-white hover:scale-105 active:scale-95 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Demo: {activeConfig.shortLabel}</span>
          <span className="text-slate-400 text-xs">▲</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Demo Role Simulator Bar"
      className={`fixed bottom-4 inset-x-4 max-w-4xl mx-auto z-40 apple-liquid-glass rounded-2xl shadow-2xl border border-white/40 dark:border-white/15 p-2 transition-all duration-200 ${className}`.trim()}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Active Simulation Persona Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 min-h-[44px] self-start sm:self-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {activeConfig.staffName}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {activeConfig.description}
            </span>
          </div>
        </div>

        {/* 6 Quick Role Switches */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl no-scrollbar">
          {SIMULATOR_ROLES.map((config) => (
            <RoleButton
              key={config.id}
              config={config}
              isSelected={config.id === currentRole}
              onClick={() => handleSelectRole(config)}
            />
          ))}
        </div>

        {/* Actions: Reset Sandbox Data & Collapse Bar */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              aria-label="Reset Demo Sandbox Data"
              title="Reset hotel rooms, folios and orders to initial demo state"
              className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse Role Simulator Bar"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <span className="text-sm font-bold">▼</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
