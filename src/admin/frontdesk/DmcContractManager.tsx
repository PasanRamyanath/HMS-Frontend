import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type DmcCurrency = "LKR" | "USD" | "EUR" | "GBP";
export type DmcPartnerTier = "KEY_ACCOUNT" | "PREFERRED" | "STANDARD" | "BOUTIQUE";

export interface SplitFolioRule {
  readonly department: "ACCOMMODATION" | "MEALS" | "BEVERAGE_EXTRAS" | "SPA" | "EXCURSIONS";
  readonly targetFolio: "DMC_MASTER" | "GUEST_EXTRAS";
  readonly percentage: number;
  readonly description: string;
}

export interface SeasonalContractRate {
  readonly id: string;
  readonly seasonName: string;
  readonly roomType: string;
  readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
  readonly netRate: number;
  readonly currency: DmcCurrency;
}

export interface DmcContract {
  readonly id: string;
  readonly companyName: string;
  readonly contractCode: string;
  readonly partnerTier: DmcPartnerTier;
  readonly creditLimitLkr: number;
  readonly usedCreditLkr: number;
  readonly creditDays: number;
  readonly contactPerson: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly discountPercent: number;
  readonly settlementCurrency: DmcCurrency;
  readonly splitFolioInstructions: string;
  readonly splitFolioRules: ReadonlyArray<SplitFolioRule>;
  readonly seasonalRates?: ReadonlyArray<SeasonalContractRate> | undefined;
  readonly isActive: boolean;
  readonly notes?: string | undefined;
}

export interface DmcContractManagerProps {
  readonly initialContracts?: ReadonlyArray<DmcContract> | undefined;
  readonly onSaveContract?: ((contract: DmcContract) => void | Promise<void>) | undefined;
  readonly onToggleStatus?: ((contractId: string, active: boolean) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Presets & Standard Rules
// ============================================================================

export const DEFAULT_SPLIT_FOLIO_RULES: ReadonlyArray<SplitFolioRule> = [
  {
    department: "ACCOMMODATION",
    targetFolio: "DMC_MASTER",
    percentage: 100,
    description: "Contracted nightly room charges billed to DMC City Ledger account",
  },
  {
    department: "MEALS",
    targetFolio: "DMC_MASTER",
    percentage: 100,
    description: "Contracted voucher meal plan (BB/HB/FB) billed to DMC account",
  },
  {
    department: "BEVERAGE_EXTRAS",
    targetFolio: "GUEST_EXTRAS",
    percentage: 100,
    description: "Bar bills, mini-bar consumption, and laundry settled by guest",
  },
  {
    department: "SPA",
    targetFolio: "GUEST_EXTRAS",
    percentage: 100,
    description: "Ayurveda wellness, spa treatments, and salon services to guest",
  },
  {
    department: "EXCURSIONS",
    targetFolio: "GUEST_EXTRAS",
    percentage: 100,
    description: "Safari jeeps, whale watching, and boat charters settled by guest",
  },
];

export const DEFAULT_DMC_CONTRACTS: ReadonlyArray<DmcContract> = [
  {
    id: "dmc-aitken",
    companyName: "Aitken Spence Travels (Pvt) Ltd",
    contractCode: "DMC-AITKEN-2026",
    partnerTier: "KEY_ACCOUNT",
    creditLimitLkr: 15000000,
    usedCreditLkr: 4250000,
    creditDays: 30,
    contactPerson: "Dinesh Weerakkody",
    contactEmail: "inbound@aitkenspence.lk",
    contactPhone: "+94112308308",
    discountPercent: 22,
    settlementCurrency: "USD",
    splitFolioInstructions:
      "Room + contracted meal plan to DMC Master Folio; Minibar, Extras, and Spa directly to Guest.",
    splitFolioRules: DEFAULT_SPLIT_FOLIO_RULES,
    isActive: true,
    notes: "Sri Lanka's leading inbound DMC. Handles European & UK charter traffic.",
  },
  {
    id: "dmc-walkers",
    companyName: "Walkers Tours (John Keells Group)",
    contractCode: "DMC-WALKERS-2026",
    partnerTier: "KEY_ACCOUNT",
    creditLimitLkr: 12000000,
    usedCreditLkr: 6800000,
    creditDays: 30,
    contactPerson: "Suranga Fernando",
    contactEmail: "inbound.res@walkerstours.com",
    contactPhone: "+94112163163",
    discountPercent: 20,
    settlementCurrency: "USD",
    splitFolioInstructions:
      "Room + contracted meal plan to Walkers master ledger; incidental charges to guest.",
    splitFolioRules: DEFAULT_SPLIT_FOLIO_RULES,
    isActive: true,
    notes: "Official partner for TUI, Kuoni UK, and Dertour Germany round-trips.",
  },
  {
    id: "dmc-jetwing",
    companyName: "Jetwing Travels",
    contractCode: "DMC-JETWING-2026",
    partnerTier: "PREFERRED",
    creditLimitLkr: 10000000,
    usedCreditLkr: 2100000,
    creditDays: 45,
    contactPerson: "Malinda Cooray",
    contactEmail: "reservations@jetwing.lk",
    contactPhone: "+94114709400",
    discountPercent: 18,
    settlementCurrency: "LKR",
    splitFolioInstructions:
      "Room charges on HB/FB to Jetwing credit account; individual beverage tabs to guest.",
    splitFolioRules: DEFAULT_SPLIT_FOLIO_RULES,
    isActive: true,
    notes: "Eco-tourism and boutique heritage tours across Cultural Triangle.",
  },
  {
    id: "dmc-diethelm",
    companyName: "Diethelm Travel Sri Lanka",
    contractCode: "DMC-DIETHELM-2026",
    partnerTier: "PREFERRED",
    creditLimitLkr: 8000000,
    usedCreditLkr: 1450000,
    creditDays: 30,
    contactPerson: "Anura Jayasinghe",
    contactEmail: "srilanka@diethelmtravel.com",
    contactPhone: "+94112440301",
    discountPercent: 20,
    settlementCurrency: "EUR",
    splitFolioInstructions:
      "Contracted accommodation + meals to Diethelm master; laundry and bar to guest.",
    splitFolioRules: DEFAULT_SPLIT_FOLIO_RULES,
    isActive: true,
    notes: "Swiss/German specialist agency for luxury wellness and cultural itineraries.",
  },
  {
    id: "dmc-bespoke",
    companyName: "Bespoke Ceylon Expeditions",
    contractCode: "DMC-BESPOKE-2026",
    partnerTier: "BOUTIQUE",
    creditLimitLkr: 3500000,
    usedCreditLkr: 980000,
    creditDays: 14,
    contactPerson: "Rohan Samarasinghe",
    contactEmail: "ops@bespokeceylon.com",
    contactPhone: "+94777123987",
    discountPercent: 15,
    settlementCurrency: "USD",
    splitFolioInstructions:
      "All villa rooms + chef meals to Bespoke agency account; excursions to guest card.",
    splitFolioRules: DEFAULT_SPLIT_FOLIO_RULES,
    isActive: true,
    notes: "High-end bespoke itineraries and luxury private villa takeovers.",
  },
];

// ============================================================================
// Pure Helpers
// ============================================================================

export function calculateCreditUtilization(
  creditLimitLkr: number,
  usedCreditLkr: number,
): {
  readonly availableLkr: number;
  readonly utilizationPercent: number;
  readonly isOverLimit: boolean;
  readonly statusColor: StatusColor;
} {
  const limit = Math.max(0, creditLimitLkr);
  const used = Math.max(0, usedCreditLkr);
  const availableLkr = Math.max(0, limit - used);
  const utilizationPercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isOverLimit = used > limit;

  let statusColor: StatusColor = "green";
  if (isOverLimit || utilizationPercent >= 85) {
    statusColor = "red";
  } else if (utilizationPercent >= 60) {
    statusColor = "amber";
  }

  return {
    availableLkr,
    utilizationPercent,
    isOverLimit,
    statusColor,
  };
}

export function validateDmcContract(contract: Partial<DmcContract>): {
  readonly isValid: boolean;
  readonly error?: string | undefined;
} {
  if (!contract.companyName || contract.companyName.trim().length < 3) {
    return { isValid: false, error: "Company legal name must be at least 3 characters" };
  }
  if (!contract.contractCode || contract.contractCode.trim().length < 3) {
    return { isValid: false, error: "Contract code is required (e.g. DMC-AITKEN-2026)" };
  }
  if (typeof contract.creditLimitLkr !== "number" || contract.creditLimitLkr < 0) {
    return { isValid: false, error: "Credit limit must be a positive number in LKR" };
  }
  if (typeof contract.creditDays !== "number" || contract.creditDays < 0) {
    return { isValid: false, error: "Credit days must be a positive integer" };
  }
  if (!contract.contactEmail || !contract.contactEmail.includes("@")) {
    return { isValid: false, error: "A valid contact email address is required" };
  }
  return { isValid: true };
}

function getTierBadgeColor(tier: DmcPartnerTier): StatusColor {
  switch (tier) {
    case "KEY_ACCOUNT":
      return "indigo";
    case "PREFERRED":
      return "blue";
    case "BOUTIQUE":
      return "green";
    default:
      return "gray";
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface DmcMetricsBannerProps {
  readonly contracts: ReadonlyArray<DmcContract>;
}

function DmcMetricsBanner({ contracts }: DmcMetricsBannerProps) {
  const totalLimit = contracts.reduce((acc, c) => acc + c.creditLimitLkr, 0);
  const totalUsed = contracts.reduce((acc, c) => acc + c.usedCreditLkr, 0);
  const activeCount = contracts.filter((c) => c.isActive).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <GlassCard material="ultraThin" radius="lg" className="p-3.5 space-y-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Active Tour Operator Contracts
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {activeCount}
          </span>
          <StatusBadge
            status={activeCount > 0 ? "CONFIRMED" : "PENDING"}
            label={`${activeCount} Active`}
            color="green"
            size="sm"
          />
        </div>
      </GlassCard>

      <GlassCard material="ultraThin" radius="lg" className="p-3.5 space-y-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Total Outstanding City Ledger
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums-lkr font-mono">
            {formatLkr(totalUsed)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {Math.round((totalUsed / (totalLimit || 1)) * 100)}% of limit
          </span>
        </div>
      </GlassCard>

      <GlassCard material="ultraThin" radius="lg" className="p-3.5 space-y-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Total Credit Facilities Granted
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums-lkr font-mono">
            {formatLkr(totalLimit)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Approved Pool</span>
        </div>
      </GlassCard>
    </div>
  );
}

interface DmcContractCardProps {
  readonly contract: DmcContract;
  readonly readOnly: boolean;
  readonly onEdit: (contract: DmcContract) => void;
  readonly onToggle: (id: string, active: boolean) => void;
}

function DmcContractCard({ contract, readOnly, onEdit, onToggle }: DmcContractCardProps) {
  const credit = calculateCreditUtilization(contract.creditLimitLkr, contract.usedCreditLkr);

  return (
    <GlassCard
      material="thin"
      radius="lg"
      className="p-4 space-y-3.5 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {contract.companyName}
              </h4>
              <StatusBadge
                status={contract.partnerTier}
                label={contract.partnerTier.replace("_", " ")}
                color={getTierBadgeColor(contract.partnerTier)}
                size="sm"
              />
            </div>
            <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
              {contract.contractCode} • {contract.settlementCurrency} Settlement
            </span>
          </div>

          <StatusBadge
            status={contract.isActive ? "CONFIRMED" : "CANCELLED"}
            label={contract.isActive ? "Active" : "Suspended"}
            color={contract.isActive ? "green" : "red"}
            size="sm"
          />
        </div>

        {/* Credit Utilization Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              City Ledger Used:{" "}
              <strong className="tabular-nums-lkr font-mono text-slate-900 dark:text-white">
                {formatLkr(contract.usedCreditLkr)}
              </strong>
            </span>
            <span className="tabular-nums-lkr font-mono">
              Limit: {formatLkr(contract.creditLimitLkr)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                credit.statusColor === "red"
                  ? "bg-red-500"
                  : credit.statusColor === "amber"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${credit.utilizationPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Terms: {contract.creditDays} Days Net</span>
            <span>Available: {formatLkr(credit.availableLkr)}</span>
          </div>
        </div>

        {/* Split Folio Instructions Preview */}
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 text-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
            Split-Folio Billing Rule:
          </span>
          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            {contract.splitFolioInstructions}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          Discount: <strong>{contract.discountPercent}% off BAR</strong>
        </span>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(contract.id, !contract.isActive)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px]"
            >
              {contract.isActive ? "Suspend" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => onEdit(contract)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors min-h-[36px]"
            >
              Edit Terms
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

interface DmcEditorModalProps {
  readonly isOpen: boolean;
  readonly contract?: DmcContract | undefined;
  readonly onClose: () => void;
  readonly onSave: (contract: DmcContract) => void;
}

function DmcEditorModal({ isOpen, contract, onClose, onSave }: DmcEditorModalProps) {
  const [name, setName] = useState<string>(contract?.companyName ?? "");
  const [code, setCode] = useState<string>(contract?.contractCode ?? "");
  const [tier, setTier] = useState<DmcPartnerTier>(contract?.partnerTier ?? "PREFERRED");
  const [limit, setLimit] = useState<number>(contract?.creditLimitLkr ?? 5000000);
  const [days, setDays] = useState<number>(contract?.creditDays ?? 30);
  const [person, setPerson] = useState<string>(contract?.contactPerson ?? "");
  const [email, setEmail] = useState<string>(contract?.contactEmail ?? "");
  const [phone, setPhone] = useState<string>(contract?.contactPhone ?? "");
  const [discount, setDiscount] = useState<number>(contract?.discountPercent ?? 20);
  const [currency, setCurrency] = useState<DmcCurrency>(contract?.settlementCurrency ?? "USD");
  const [instructions, setInstructions] = useState<string>(
    contract?.splitFolioInstructions ??
      "Room + Meal Plan to DMC Master Account; Extras/Bar/Spa to Guest Personal Folio.",
  );

  const nameId = useId();
  const codeId = useId();
  const tierId = useId();
  const currencyId = useId();
  const limitId = useId();
  const daysId = useId();
  const personId = useId();
  const emailId = useId();
  const phoneId = useId();
  const discountId = useId();
  const instrId = useId();

  const handleSave = () => {
    const payload: DmcContract = {
      id: contract?.id ?? `dmc-${Date.now()}`,
      companyName: name.trim(),
      contractCode: code.trim().toUpperCase(),
      partnerTier: tier,
      creditLimitLkr: limit,
      usedCreditLkr: contract?.usedCreditLkr ?? 0,
      creditDays: days,
      contactPerson: person.trim(),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      discountPercent: discount,
      settlementCurrency: currency,
      splitFolioInstructions: instructions.trim(),
      splitFolioRules: contract?.splitFolioRules ?? DEFAULT_SPLIT_FOLIO_RULES,
      isActive: contract?.isActive ?? true,
    };
    onSave(payload);
    onClose();
  };

  const validation = validateDmcContract({
    companyName: name,
    contractCode: code,
    creditLimitLkr: limit,
    creditDays: days,
    contactEmail: email,
  });

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? "Edit Tour Operator Contract" : "Register Destination Management Company"}
      description="Configure contracted net credit limit, payment days, and split-folio billing instructions."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!validation.isValid}
            onClick={handleSave}
            className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors min-h-[44px]"
          >
            Save Contract Agreement
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={nameId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Company Legal Name *
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aitken Spence Travels"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={codeId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Contract Reference Code *
            </label>
            <input
              id={codeId}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. DMC-AITKEN-2026"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono uppercase min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={tierId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Partner Tier
            </label>
            <select
              id={tierId}
              value={tier}
              onChange={(e) => setTier(e.target.value as DmcPartnerTier)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            >
              <option value="KEY_ACCOUNT">Key Account</option>
              <option value="PREFERRED">Preferred Partner</option>
              <option value="STANDARD">Standard</option>
              <option value="BOUTIQUE">Boutique Agency</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={currencyId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Settlement Currency
            </label>
            <select
              id={currencyId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as DmcCurrency)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            >
              <option value="USD">USD ($)</option>
              <option value="LKR">LKR (Rs)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={limitId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Approved Credit Limit (LKR) *
            </label>
            <input
              id={limitId}
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={daysId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Credit Terms (Days) *
            </label>
            <input
              id={daysId}
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={discountId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Wholesale Discount (%)
            </label>
            <input
              id={discountId}
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={personId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Contact Person
            </label>
            <input
              id={personId}
              type="text"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={emailId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Billing Email *
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={phoneId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Phone Number
            </label>
            <input
              id={phoneId}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={instrId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Split-Folio Billing Routing Instructions *
          </label>
          <textarea
            id={instrId}
            value={instructions}
            rows={2}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 resize-none min-h-[60px]"
          />
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DmcContractManager({
  initialContracts = DEFAULT_DMC_CONTRACTS,
  onSaveContract,
  onToggleStatus,
  readOnly = false,
  className = "",
}: DmcContractManagerProps) {
  const [contracts, setContracts] = useState<ReadonlyArray<DmcContract>>(initialContracts);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingContract, setEditingContract] = useState<DmcContract | undefined>(undefined);

  const filterOptions: ReadonlyArray<SegmentedControlOption<string>> = useMemo(
    () => [
      { id: "ALL", label: "All Agencies" },
      { id: "KEY_ACCOUNT", label: "Key Accounts" },
      { id: "PREFERRED", label: "Preferred" },
      { id: "BOUTIQUE", label: "Boutique" },
    ],
    [],
  );

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier = filterTier === "ALL" || c.partnerTier === filterTier;
      return matchesSearch && matchesTier;
    });
  }, [contracts, searchQuery, filterTier]);

  const handleToggle = (id: string, active: boolean) => {
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: active } : c)));
    onToggleStatus?.(id, active);
  };

  const handleSave = (updated: DmcContract) => {
    setContracts((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      return [updated, ...prev];
    });
    onSaveContract?.(updated);
  };

  const handleOpenAdd = () => {
    setEditingContract(undefined);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (contract: DmcContract) => {
    setEditingContract(contract);
    setIsEditorOpen(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Destination Management Companies (DMC) & Tour Operator Contracts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wholesale net rate agreements, credit facilities & split-folio billing automation
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            + Register New DMC Contract
          </button>
        )}
      </div>

      {/* Aggregate KPI Banner */}
      <DmcMetricsBanner contracts={contracts} />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tour company name, contract code (e.g. DMC-AITKEN), or contact..."
          className="px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white min-h-[44px] sm:w-80"
        />

        <SegmentedControl<string>
          value={filterTier}
          onChange={setFilterTier}
          options={filterOptions}
          size="sm"
        />
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredContracts.map((contract) => (
          <DmcContractCard
            key={contract.id}
            contract={contract}
            readOnly={readOnly}
            onEdit={handleOpenEdit}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Editor Modal */}
      <DmcEditorModal
        isOpen={isEditorOpen}
        contract={editingContract}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
