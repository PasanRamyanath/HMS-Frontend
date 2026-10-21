/**
 * Tenant SaaS Subscription Tier & Feature Flag Manager Modal (`TenantPlanConfigModal.tsx`).
 * Configures Sri Lankan SaaS tiers:
 * - STARTER_QR_ONLY: LKR 4,500/mo (Contactless QR, KDS, LankaQR Pay)
 * - GROWTH_PMS_PLUS_QR: LKR 12,500/mo (Front-Desk, Tape Chart, Housekeeping, Tax)
 * - ENTERPRISE_RESORT_ERP: LKR 24,500/mo (Full 13 Modules, Banquets, Payroll, Multi-Property)
 * Implements Apple HIG Liquid Glass translucency, continuous squircle geometry,
 * and tabular numeral formatting.
 */

import { useId, useMemo, useState } from "react";

export type PlanTier = "STARTER_QR_ONLY" | "GROWTH_PMS_PLUS_QR" | "ENTERPRISE_RESORT_ERP";

export type ModuleKey =
  | "qrMenuAndOrdering"
  | "kdsKitchen"
  | "lankaQrPay"
  | "frontDeskPms"
  | "tapeChart"
  | "housekeeping"
  | "banquets"
  | "spaAndActivities"
  | "storesAndInventory"
  | "taxSltdaIrd"
  | "payrollEpfEtf"
  | "multiProperty"
  | "auditLogSha256";

export interface ModuleDefinition {
  readonly key: ModuleKey;
  readonly name: string;
  readonly category: "GUEST_FACING" | "CORE_PMS" | "OPERATIONS" | "STATUTORY_ERP";
  readonly description: string;
  readonly addOnMonthlyPriceLkr: number; // 0 if standard
}

export interface PlanTierSpecification {
  readonly tier: PlanTier;
  readonly name: string;
  readonly monthlyPriceLkr: number;
  readonly maxRooms: number | "UNLIMITED";
  readonly maxMonthlyQrOrders: number | "UNLIMITED";
  readonly description: string;
  readonly includedModules: ReadonlyArray<ModuleKey>;
}

export interface TenantPlanConfig {
  readonly tenantId: string;
  readonly planTier: PlanTier;
  readonly activeAddOnKeys: ReadonlyArray<string>;
  readonly customOverrides: Record<string, boolean>;
  readonly calculatedMonthlyBillLkr: number;
  readonly effectiveDate: string;
}

export const MODULE_CATALOG: ReadonlyArray<ModuleDefinition> = [
  {
    key: "qrMenuAndOrdering",
    name: "Contactless QR Menu & Ordering",
    category: "GUEST_FACING",
    description: "Zero-login trilingual room service ordering with dietary badges.",
    addOnMonthlyPriceLkr: 0,
  },
  {
    key: "kdsKitchen",
    name: "Kitchen Display System (KDS)",
    category: "OPERATIONS",
    description: "Real-time kitchen order ticket dispatch and runner status.",
    addOnMonthlyPriceLkr: 0,
  },
  {
    key: "lankaQrPay",
    name: "LankaQR & Dynamic EMVCo Pay",
    category: "GUEST_FACING",
    description: "Central Bank of Sri Lanka compliant LankaQR instant checkout.",
    addOnMonthlyPriceLkr: 0,
  },
  {
    key: "frontDeskPms",
    name: "Front Desk & Guest Reservations",
    category: "CORE_PMS",
    description: "Guest check-in, passport/NIC validation, and reservation folios.",
    addOnMonthlyPriceLkr: 3500,
  },
  {
    key: "tapeChart",
    name: "Visual Room Tape Chart",
    category: "CORE_PMS",
    description: "Drag-and-drop room timeline, occupancy calendar, and room moves.",
    addOnMonthlyPriceLkr: 2500,
  },
  {
    key: "housekeeping",
    name: "Housekeeping & Engineering Runner",
    category: "OPERATIONS",
    description: "Room cleaning status toggles, minibar replenishment, and work orders.",
    addOnMonthlyPriceLkr: 2500,
  },
  {
    key: "banquets",
    name: "Banquets & Wedding Hall Events",
    category: "OPERATIONS",
    description: "Hall layout designer, session bookings, and banquet event orders (BEO).",
    addOnMonthlyPriceLkr: 3500,
  },
  {
    key: "spaAndActivities",
    name: "Spa, Wellness & Excursions",
    category: "OPERATIONS",
    description: "Ayurvedic treatment scheduling, therapist rosters, and safari tours.",
    addOnMonthlyPriceLkr: 2500,
  },
  {
    key: "storesAndInventory",
    name: "Stores & Kitchen Procurement",
    category: "OPERATIONS",
    description: "Recipe costing, minimum stock reorders, and goods received notes.",
    addOnMonthlyPriceLkr: 3000,
  },
  {
    key: "taxSltdaIrd",
    name: "SLTDA & IRD Compounding Tax Engine",
    category: "STATUTORY_ERP",
    description: "4-stage compounding tax (10% SC -> 1% TDL -> 2.5% SSCL -> 18% VAT).",
    addOnMonthlyPriceLkr: 3000,
  },
  {
    key: "payrollEpfEtf",
    name: "EPF/ETF Payroll & 10% SC Pool",
    category: "STATUTORY_ERP",
    description: "Central Bank C-Form returns, 8%/12% EPF, 3% ETF, and service charge points.",
    addOnMonthlyPriceLkr: 4500,
  },
  {
    key: "multiProperty",
    name: "Multi-Property Group Rollup",
    category: "STATUTORY_ERP",
    description: "Consolidated group-wide occupancy, ADR, RevPAR, and property switcher.",
    addOnMonthlyPriceLkr: 5000,
  },
  {
    key: "auditLogSha256",
    name: "SHA-256 Immutable Audit Log",
    category: "STATUTORY_ERP",
    description: "Tamper-evident cryptographically chained audit trails for financial compliance.",
    addOnMonthlyPriceLkr: 2000,
  },
];

export const PLAN_TIER_SPECS: Record<PlanTier, PlanTierSpecification> = {
  STARTER_QR_ONLY: {
    tier: "STARTER_QR_ONLY",
    name: "Starter QR Ordering",
    monthlyPriceLkr: 4500,
    maxRooms: 15,
    maxMonthlyQrOrders: 1500,
    description:
      "Perfect for rest houses, beach cafes, and boutique villas needing contactless ordering.",
    includedModules: ["qrMenuAndOrdering", "kdsKitchen", "lankaQrPay"],
  },
  GROWTH_PMS_PLUS_QR: {
    tier: "GROWTH_PMS_PLUS_QR",
    name: "Growth PMS + QR",
    monthlyPriceLkr: 12500,
    maxRooms: 40,
    maxMonthlyQrOrders: 10000,
    description:
      "Comprehensive front-desk PMS, tape chart, housekeeping, and statutory tax for boutique hotels.",
    includedModules: [
      "qrMenuAndOrdering",
      "kdsKitchen",
      "lankaQrPay",
      "frontDeskPms",
      "tapeChart",
      "housekeeping",
      "taxSltdaIrd",
      "auditLogSha256",
    ],
  },
  ENTERPRISE_RESORT_ERP: {
    tier: "ENTERPRISE_RESORT_ERP",
    name: "Enterprise Resort ERP",
    monthlyPriceLkr: 24500,
    maxRooms: "UNLIMITED",
    maxMonthlyQrOrders: "UNLIMITED",
    description:
      "Full-scale resort operating system with Banquets, Spa, Procurement, and EPF/ETF Payroll.",
    includedModules: [
      "qrMenuAndOrdering",
      "kdsKitchen",
      "lankaQrPay",
      "frontDeskPms",
      "tapeChart",
      "housekeeping",
      "banquets",
      "spaAndActivities",
      "storesAndInventory",
      "taxSltdaIrd",
      "payrollEpfEtf",
      "multiProperty",
      "auditLogSha256",
    ],
  },
};

export function calculateTotalMonthlyBill(
  planTier: PlanTier,
  activeAddOnKeys: ReadonlyArray<string>,
): number {
  const basePrice = PLAN_TIER_SPECS[planTier].monthlyPriceLkr;
  const spec = PLAN_TIER_SPECS[planTier];

  const addOnCost = activeAddOnKeys.reduce((acc, key) => {
    // If the module is already included in the base plan, no add-on fee applies
    if (spec.includedModules.includes(key as ModuleKey)) {
      return acc;
    }
    const def = MODULE_CATALOG.find((m) => m.key === key);
    return acc + (def?.addOnMonthlyPriceLkr ?? 0);
  }, 0);

  return basePrice + addOnCost;
}

export function isModuleActive(
  moduleKey: ModuleKey,
  planTier: PlanTier,
  activeAddOnKeys: ReadonlyArray<string>,
  customOverrides?: Record<string, boolean>,
): boolean {
  if (customOverrides && typeof customOverrides[moduleKey] === "boolean") {
    return Boolean(customOverrides[moduleKey]);
  }
  const spec = PLAN_TIER_SPECS[planTier];
  if (spec.includedModules.includes(moduleKey)) {
    return true;
  }
  return activeAddOnKeys.includes(moduleKey);
}

export function formatPriceLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

interface TierCardProps {
  readonly spec: PlanTierSpecification;
  readonly isSelected: boolean;
  readonly onSelect: (tier: PlanTier) => void;
}

function TierCard({ spec, isSelected, onSelect }: TierCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(spec.tier)}
      className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between ${
        isSelected
          ? "apple-liquid-glass bg-apple-blue/10 dark:bg-apple-blue/20 border-apple-blue shadow-md ring-2 ring-apple-blue"
          : "bg-white/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm font-bold text-slate-900 dark:text-white">{spec.name}</span>
          {isSelected && (
            <span className="w-5 h-5 rounded-full bg-apple-blue text-white flex items-center justify-center shrink-0">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
          )}
        </div>
        <div className="text-xl font-extrabold text-apple-blue tabular-nums-lkr tracking-tight mb-1">
          {formatPriceLkr(spec.monthlyPriceLkr)}
          <span className="text-xs font-normal text-slate-400"> / mo</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{spec.description}</p>
      </div>

      <div className="pt-2 border-t border-slate-200/40 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Rooms: {spec.maxRooms === "UNLIMITED" ? "Unlimited" : `Up to ${spec.maxRooms}`}</span>
        <span>
          Orders:{" "}
          {spec.maxMonthlyQrOrders === "UNLIMITED" ? "Unlimited" : `${spec.maxMonthlyQrOrders}/mo`}
        </span>
      </div>
    </button>
  );
}

interface ModuleToggleRowProps {
  readonly moduleDef: ModuleDefinition;
  readonly isIncludedInTier: boolean;
  readonly isActive: boolean;
  readonly onToggle: (key: ModuleKey) => void;
}

function ModuleToggleRow({
  moduleDef,
  isIncludedInTier,
  isActive,
  onToggle,
}: ModuleToggleRowProps) {
  const switchId = `module-switch-${moduleDef.key}`;

  return (
    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <label
            htmlFor={switchId}
            className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
          >
            {moduleDef.name}
          </label>
          {isIncludedInTier ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Included in Plan
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20">
              + {formatPriceLkr(moduleDef.addOnMonthlyPriceLkr)}/mo Add-On
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {moduleDef.description}
        </p>
      </div>

      {/* iOS-Style Toggle Switch */}
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={isActive}
        disabled={isIncludedInTier}
        onClick={() => onToggle(moduleDef.key)}
        className={`w-11 h-6 rounded-full transition-colors duration-200 ease-apple-spring relative p-0.5 shrink-0 ${
          isIncludedInTier
            ? "bg-emerald-500 opacity-90 cursor-default"
            : isActive
              ? "bg-apple-blue cursor-pointer"
              : "bg-slate-300 dark:bg-slate-700 cursor-pointer"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-apple-spring ${
            isActive ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

interface ModalFooterProps {
  readonly totalMonthlyBill: number;
  readonly onSave: () => void;
  readonly onClose: () => void;
}

function ModalFooter({ totalMonthlyBill, onSave, onClose }: ModalFooterProps) {
  return (
    <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <span className="text-xs text-slate-500 dark:text-slate-400 block">
          Net Monthly Subscription Bill:
        </span>
        <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums-lkr tracking-tight">
          {formatPriceLkr(totalMonthlyBill)}
          <span className="text-xs font-normal text-slate-400"> / month</span>
        </span>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-apple-blue hover:bg-apple-blue/90 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          Save Plan Entitlements
        </button>
      </div>
    </div>
  );
}

export interface TenantPlanConfigModalProps {
  readonly isOpen: boolean;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly currentPlan?: PlanTier | undefined;
  readonly currentAddOns?: ReadonlyArray<string> | undefined;
  readonly onSave?: ((config: TenantPlanConfig) => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}

export function TenantPlanConfigModal({
  isOpen,
  tenantId,
  tenantName,
  currentPlan = "GROWTH_PMS_PLUS_QR",
  currentAddOns = [],
  onSave,
  onClose,
}: TenantPlanConfigModalProps) {
  const [selectedTier, setSelectedTier] = useState<PlanTier>(currentPlan);
  const [activeAddOns, setActiveAddOns] = useState<ReadonlyArray<string>>(currentAddOns);
  const modalId = useId();

  const totalMonthlyBill = useMemo(
    () => calculateTotalMonthlyBill(selectedTier, activeAddOns),
    [selectedTier, activeAddOns],
  );

  const handleToggleAddOn = (key: ModuleKey) => {
    setActiveAddOns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSaveAction = () => {
    if (onSave) {
      onSave({
        tenantId,
        planTier: selectedTier,
        activeAddOnKeys: activeAddOns,
        customOverrides: {},
        calculatedMonthlyBillLkr: totalMonthlyBill,
        effectiveDate: new Date().toISOString(),
      });
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const tierSpec = PLAN_TIER_SPECS[selectedTier];

  return (
    <dialog
      open
      id={modalId}
      aria-label={`Configure Subscription Plan for ${tenantName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 m-0 max-w-none max-h-none w-full h-full border-0"
    >
      <div className="w-full max-w-3xl rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-apple-blue">
                SaaS Subscription & Entitlements
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {tenantId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tenantName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select base subscription tier and customize optional module feature flags.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Plan Tiers Selection */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              1. Choose Base Subscription Tier
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TierCard
                spec={PLAN_TIER_SPECS.STARTER_QR_ONLY}
                isSelected={selectedTier === "STARTER_QR_ONLY"}
                onSelect={setSelectedTier}
              />
              <TierCard
                spec={PLAN_TIER_SPECS.GROWTH_PMS_PLUS_QR}
                isSelected={selectedTier === "GROWTH_PMS_PLUS_QR"}
                onSelect={setSelectedTier}
              />
              <TierCard
                spec={PLAN_TIER_SPECS.ENTERPRISE_RESORT_ERP}
                isSelected={selectedTier === "ENTERPRISE_RESORT_ERP"}
                onSelect={setSelectedTier}
              />
            </div>
          </div>

          {/* Module Entitlements List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Module Entitlements & Optional Add-Ons
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {tierSpec.includedModules.length} Modules Included
              </span>
            </div>

            <div className="space-y-2">
              {MODULE_CATALOG.map((mod) => {
                const isIncluded = tierSpec.includedModules.includes(mod.key);
                const isActive = isModuleActive(mod.key, selectedTier, activeAddOns);

                return (
                  <ModuleToggleRow
                    key={mod.key}
                    moduleDef={mod}
                    isIncludedInTier={isIncluded}
                    isActive={isActive}
                    onToggle={handleToggleAddOn}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Net Bill */}
        <ModalFooter
          totalMonthlyBill={totalMonthlyBill}
          onSave={handleSaveAction}
          onClose={() => {
            if (onClose) onClose();
          }}
        />
      </div>
    </dialog>
  );
}
