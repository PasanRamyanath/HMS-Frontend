import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { Department } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";
import type { FolioPartition } from "./FolioDetailView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type FolioChargeCategory =
  | "LAUNDRY"
  | "MINIBAR"
  | "EARLY_CHECKIN"
  | "LATE_CHECKOUT"
  | "DAMAGE_BREAKAGE"
  | "MANAGER_REBATE"
  | "MISC_SERVICE";

export type RebateOrAdjustmentReasonCode =
  | "SERVICE_RECOVERY"
  | "MANAGER_COURTESY"
  | "ROOM_MAINTENANCE_DEFECT"
  | "NOISE_DISTURBANCE"
  | "BILLING_CORRECTION"
  | "INVENTORY_DAMAGE"
  | "EARLY_ARRIVAL_AGREED"
  | "OTHER";

export interface CategoryPresetConfig {
  readonly category: FolioChargeCategory;
  readonly label: string;
  readonly defaultDepartment: Department;
  readonly defaultDescription: string;
  readonly defaultAmountLkr: number;
  readonly defaultScExempt: boolean;
  readonly isRebate: boolean;
}

export interface PostFolioLinePayload {
  readonly partition: FolioPartition;
  readonly category: FolioChargeCategory;
  readonly department: Department;
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly baseSupplyLkr: number;
  readonly isServiceChargeExempt: boolean;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalGrossLkr: number;
  readonly reasonCode?: RebateOrAdjustmentReasonCode | undefined;
  readonly notes?: string | undefined;
}

export interface TaxCalculationResult {
  readonly baseSupplyLkr: number;
  readonly isServiceChargeExempt: boolean;
  readonly serviceChargeLkr: number;
  readonly subtotalAfterScLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatBaseLkr: number;
  readonly vatLkr: number;
  readonly totalGrossLkr: number;
  readonly effectiveMultiplier: number;
}

export interface FormValidationInput {
  readonly description: string;
  readonly unitPriceLkr: number;
  readonly quantity: number;
  readonly isReasonRequired: boolean;
  readonly notes: string;
}

export interface PostFolioLineModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (payload: PostFolioLinePayload) => Promise<void> | void;
  readonly defaultPartition?: FolioPartition | undefined;
  readonly guestContext?:
    | {
        readonly guestFullName: string;
        readonly roomNumber: string;
        readonly bookingReference?: string | undefined;
        readonly dmcContractName?: string | undefined;
      }
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Presets & Constants
// ============================================================================

export const CATEGORY_PRESETS: ReadonlyArray<CategoryPresetConfig> = [
  {
    category: "LAUNDRY",
    label: "Laundry & Dry Cleaning",
    defaultDepartment: Department.Housekeeping,
    defaultDescription: "Express Laundry - 3 Garments Pressed",
    defaultAmountLkr: 3500,
    defaultScExempt: false,
    isRebate: false,
  },
  {
    category: "MINIBAR",
    label: "Minibar Restock",
    defaultDepartment: Department.Bar,
    defaultDescription: "Minibar Consumption - Lion Beers & Premium Cashews",
    defaultAmountLkr: 4800,
    defaultScExempt: false,
    isRebate: false,
  },
  {
    category: "EARLY_CHECKIN",
    label: "Early Check-In",
    defaultDepartment: Department.FrontOffice,
    defaultDescription: "Guaranteed 09:00 AM Early Check-In Surcharge",
    defaultAmountLkr: 15000,
    defaultScExempt: false,
    isRebate: false,
  },
  {
    category: "LATE_CHECKOUT",
    label: "Late Check-Out",
    defaultDepartment: Department.FrontOffice,
    defaultDescription: "Extended 18:00 Late Check-Out Facility",
    defaultAmountLkr: 18000,
    defaultScExempt: false,
    isRebate: false,
  },
  {
    category: "DAMAGE_BREAKAGE",
    label: "Damage & Breakage",
    defaultDepartment: Department.Housekeeping,
    defaultDescription: "Broken Crystal Tumbler & Stained Linen Recovery",
    defaultAmountLkr: 7500,
    defaultScExempt: true,
    isRebate: false,
  },
  {
    category: "MANAGER_REBATE",
    label: "Manager Rebate / Concession",
    defaultDepartment: Department.FrontOffice,
    defaultDescription: "GM Goodwill Concession for Air Conditioning Defect",
    defaultAmountLkr: 10000,
    defaultScExempt: true,
    isRebate: true,
  },
  {
    category: "MISC_SERVICE",
    label: "Misc Guest Service",
    defaultDepartment: Department.FrontOffice,
    defaultDescription: "Concierge Bespoke Excursion Booking Fee",
    defaultAmountLkr: 5000,
    defaultScExempt: false,
    isRebate: false,
  },
];

export const REASON_CODE_OPTIONS: ReadonlyArray<{
  readonly code: RebateOrAdjustmentReasonCode;
  readonly label: string;
  readonly requiresJustification: boolean;
}> = [
  {
    code: "SERVICE_RECOVERY",
    label: "Service Recovery / Guest Compensation",
    requiresJustification: true,
  },
  {
    code: "MANAGER_COURTESY",
    label: "General Manager VIP Courtesy Concession",
    requiresJustification: true,
  },
  {
    code: "ROOM_MAINTENANCE_DEFECT",
    label: "Room Maintenance / Hardware Defect",
    requiresJustification: true,
  },
  {
    code: "NOISE_DISTURBANCE",
    label: "Noise / Environmental Disturbance",
    requiresJustification: true,
  },
  {
    code: "BILLING_CORRECTION",
    label: "Front Desk & Cashier Correction",
    requiresJustification: true,
  },
  {
    code: "INVENTORY_DAMAGE",
    label: "Room Asset & Inventory Breakage",
    requiresJustification: true,
  },
  {
    code: "EARLY_ARRIVAL_AGREED",
    label: "Pre-arranged Early Arrival Agreement",
    requiresJustification: false,
  },
  {
    code: "OTHER",
    label: "Other Documented Reason",
    requiresJustification: true,
  },
];

export const QUICK_ADD_AMOUNTS: ReadonlyArray<number> = [1000, 2500, 5000, 10000, 25000];

// ============================================================================
// Math & Domain Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateLineTaxes(
  baseSupplyLkr: number,
  isServiceChargeExempt = false,
  customRates?: {
    readonly scRate?: number;
    readonly tdlRate?: number;
    readonly ssclRate?: number;
    readonly vatRate?: number;
  },
): TaxCalculationResult {
  const scRate = isServiceChargeExempt ? 0 : (customRates?.scRate ?? 0.1);
  const tdlRate = customRates?.tdlRate ?? 0.01;
  const ssclRate = customRates?.ssclRate ?? 0.025;
  const vatRate = customRates?.vatRate ?? 0.18;

  const base = roundLkr(baseSupplyLkr);
  const sc = roundLkr(base * scRate);
  const subtotalAfterSc = roundLkr(base + sc);
  const tdl = roundLkr(subtotalAfterSc * tdlRate);
  const sscl = roundLkr(subtotalAfterSc * ssclRate);
  const vatBase = roundLkr(subtotalAfterSc + tdl + sscl);
  const vat = roundLkr(vatBase * vatRate);
  const totalGross = roundLkr(subtotalAfterSc + tdl + sscl + vat);

  const effectiveMultiplier =
    Math.abs(base) > 0 ? roundLkr((Math.abs(totalGross) / Math.abs(base)) * 100000) / 100000 : 0;

  return {
    baseSupplyLkr: base,
    isServiceChargeExempt,
    serviceChargeLkr: sc,
    subtotalAfterScLkr: subtotalAfterSc,
    tdlLkr: tdl,
    ssclLkr: sscl,
    vatBaseLkr: vatBase,
    vatLkr: vat,
    totalGrossLkr: totalGross,
    effectiveMultiplier,
  };
}

export function getCategoryPreset(category: FolioChargeCategory): CategoryPresetConfig {
  const found = CATEGORY_PRESETS.find((p) => p.category === category);
  if (found) {
    return found;
  }
  const fallback = CATEGORY_PRESETS[0];
  if (!fallback) {
    throw new Error("CATEGORY_PRESETS must not be empty");
  }
  return fallback;
}

export function validatePostFolioLineForm(input: FormValidationInput): string | null {
  if (!input.description.trim()) {
    return "Please enter a valid description for this charge.";
  }
  if (input.unitPriceLkr <= 0) {
    return "Amount must be greater than zero.";
  }
  if (input.quantity < 1) {
    return "Quantity must be at least 1.";
  }
  if (input.isReasonRequired && input.notes.trim().length < 5) {
    return "Manager concessions and damage charges require at least 5 characters of documented justification.";
  }
  return null;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface PartitionSelectorProps {
  readonly partition: FolioPartition;
  readonly onChange: (p: FolioPartition) => void;
  readonly dmcName?: string | undefined;
}

function PartitionSelector({ partition, onChange, dmcName }: PartitionSelectorProps) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
        Target Sub-Folio Destination
      </span>
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/60 ">
        <button
          type="button"
          onClick={() => onChange("GUEST_PERSONAL")}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex flex-col items-center justify-center ${
            partition === "GUEST_PERSONAL"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Guest Personal Folio</span>
          <span className="text-[10px] font-normal opacity-70">Payable at Check-Out</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("MASTER_DMC")}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex flex-col items-center justify-center ${
            partition === "MASTER_DMC"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>DMC Master Folio</span>
          <span className="text-[10px] font-normal opacity-70 truncate max-w-[160px]">
            {dmcName ?? "Tour Operator Voucher"}
          </span>
        </button>
      </div>
    </div>
  );
}

interface CategoryPickerProps {
  readonly selectedCategory: FolioChargeCategory;
  readonly onSelect: (preset: CategoryPresetConfig) => void;
}

function CategoryPicker({ selectedCategory, onSelect }: CategoryPickerProps) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
        Charge Category & Department
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CATEGORY_PRESETS.map((preset) => {
          const isSelected = preset.category === selectedCategory;
          return (
            <button
              key={preset.category}
              type="button"
              onClick={() => onSelect(preset)}
              className={`p-2.5 rounded-2xl text-left border transition-all min-h-[44px] ${
                isSelected
                  ? preset.isRebate
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                    : "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                  : "bg-white/60 border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="text-xs font-semibold">{preset.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5 flex items-center justify-between">
                <span>{preset.defaultDepartment}</span>
                {preset.isRebate && <span className="text-emerald-600 font-bold">REBATE</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ChargeDetailsInputsProps {
  readonly descId: string;
  readonly qtyId: string;
  readonly description: string;
  readonly quantity: number;
  readonly onDescriptionChange: (val: string) => void;
  readonly onQuantityChange: (val: number) => void;
}

function ChargeDetailsInputs({
  descId,
  qtyId,
  description,
  quantity,
  onDescriptionChange,
  onQuantityChange,
}: ChargeDetailsInputsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className="sm:col-span-3">
        <label htmlFor={descId} className="block text-xs font-semibold text-slate-700 mb-1">
          Charge Description *
        </label>
        <input
          id={descId}
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-xs min-h-[44px] focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Laundry service, Extra rollaway bed"
        />
      </div>

      <div>
        <label htmlFor={qtyId} className="block text-xs font-semibold text-slate-700 mb-1">
          Quantity
        </label>
        <input
          id={qtyId}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => onQuantityChange(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-xs min-h-[44px] text-center font-mono"
        />
      </div>
    </div>
  );
}

interface UnitPriceInputProps {
  readonly amountId: string;
  readonly unitPriceLkr: number;
  readonly onPriceChange: (val: number) => void;
  readonly onQuickAdd: (val: number) => void;
}

function UnitPriceInput({
  amountId,
  unitPriceLkr,
  onPriceChange,
  onQuickAdd,
}: UnitPriceInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={amountId} className="text-xs font-semibold text-slate-700 ">
          Base Supply Amount (LKR) *
        </label>
        <div className="flex items-center gap-1">
          {QUICK_ADD_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => onQuickAdd(amt)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 "
            >
              +{amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          LKR
        </span>
        <input
          id={amountId}
          type="number"
          min={0}
          step={100}
          value={unitPriceLkr || ""}
          onChange={(e) => onPriceChange(Number.parseFloat(e.target.value) || 0)}
          className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-xs min-h-[44px] font-mono tabular-nums font-bold text-slate-900 "
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

interface ServiceChargeToggleProps {
  readonly scExemptId: string;
  readonly isScExempt: boolean;
  readonly onToggle: (checked: boolean) => void;
}

function ServiceChargeToggle({ scExemptId, isScExempt, onToggle }: ServiceChargeToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
      <div>
        <label
          htmlFor={scExemptId}
          className="text-xs font-semibold text-slate-800 cursor-pointer block"
        >
          Exempt 10% Service Charge (SC-Free)
        </label>
        <span className="text-[10px] text-slate-500 block">
          Pass-through statutory rate (only applies 1% TDL + 2.5% SSCL + 18% VAT). Standard for
          damages or direct vendor reimbursements.
        </span>
      </div>
      <input
        id={scExemptId}
        type="checkbox"
        checked={isScExempt}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 border-slate-300"
      />
    </div>
  );
}

interface ReasonSectionProps {
  readonly reasonId: string;
  readonly notesId: string;
  readonly reasonCode: RebateOrAdjustmentReasonCode;
  readonly notes: string;
  readonly onReasonChange: (val: RebateOrAdjustmentReasonCode) => void;
  readonly onNotesChange: (val: string) => void;
}

function ReasonSection({
  reasonId,
  notesId,
  reasonCode,
  notes,
  onReasonChange,
  onNotesChange,
}: ReasonSectionProps) {
  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-100/60 border border-slate-200 ">
      <div>
        <label htmlFor={reasonId} className="block text-xs font-semibold text-slate-700 mb-1">
          Statutory Reason Code *
        </label>
        <select
          id={reasonId}
          value={reasonCode}
          onChange={(e) => onReasonChange(e.target.value as RebateOrAdjustmentReasonCode)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs min-h-[44px]"
        >
          {REASON_CODE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
          Audit Log Justification Notes *
        </label>
        <textarea
          id={notesId}
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Explain the reason for this concession or damage claim for audit compliance..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs resize-none"
        />
      </div>
    </div>
  );
}

interface LiveTaxBreakdownProps {
  readonly breakdown: TaxCalculationResult;
  readonly isRebate: boolean;
}

function LiveTaxBreakdownCard({ breakdown, isRebate }: LiveTaxBreakdownProps) {
  const prefix = isRebate ? "-" : "+";
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 ">
          Statutory 4-Stage Tax Breakdown (IRD & SLTDA)
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            breakdown.isServiceChargeExempt
              ? "bg-amber-100 text-amber-800 "
              : "bg-blue-100 text-blue-800 "
          }`}
        >
          {breakdown.isServiceChargeExempt ? "1.2213x SC-Exempt" : "1.34343x Standard"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
        <div className="bg-white/60 p-2 rounded-xl">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Stage 0 Base</div>
          <div className="font-mono tabular-nums font-semibold mt-0.5">
            {prefix}
            {formatLkr(Math.abs(breakdown.baseSupplyLkr))}
          </div>
        </div>

        <div className="bg-white/60 p-2 rounded-xl">
          <div className="text-[10px] text-slate-500 uppercase font-medium">
            Stage 1 SC ({breakdown.isServiceChargeExempt ? "0%" : "10%"})
          </div>
          <div className="font-mono tabular-nums font-semibold mt-0.5">
            {prefix}
            {formatLkr(Math.abs(breakdown.serviceChargeLkr))}
          </div>
        </div>

        <div className="bg-white/60 p-2 rounded-xl">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Stage 2 & 3 Levies</div>
          <div className="font-mono tabular-nums font-semibold mt-0.5 text-slate-600 ">
            {prefix}
            {formatLkr(Math.abs(breakdown.tdlLkr + breakdown.ssclLkr))}
          </div>
          <div className="text-[9px] text-slate-400">1% TDL + 2.5% SSCL</div>
        </div>

        <div className="bg-white/60 p-2 rounded-xl">
          <div className="text-[10px] text-slate-500 uppercase font-medium">Stage 4 VAT (18%)</div>
          <div className="font-mono tabular-nums font-semibold mt-0.5">
            {prefix}
            {formatLkr(Math.abs(breakdown.vatLkr))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 ">
          {isRebate ? "Net Folio Credit Amount" : "Grand Total Payable"}
        </span>
        <span
          className={`font-mono tabular-nums font-extrabold text-sm ${
            isRebate ? "text-emerald-600 " : "text-slate-900 "
          }`}
        >
          {prefix}
          {formatLkr(Math.abs(breakdown.totalGrossLkr))}
        </span>
      </div>
    </div>
  );
}

interface ModalActionsProps {
  readonly isSubmitting: boolean;
  readonly isRebate: boolean;
  readonly totalGrossLkr: number;
  readonly onClose: () => void;
}

function ModalActions({ isSubmitting, isRebate, totalGrossLkr, onClose }: ModalActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 ">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold min-h-[44px] hover:bg-slate-100 "
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all min-h-[44px] disabled:opacity-50 ${
          isRebate
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
            : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 shadow-lg"
        }`}
      >
        {isSubmitting
          ? "Posting..."
          : isRebate
            ? `Apply Rebate (-${formatLkr(Math.abs(totalGrossLkr))})`
            : `Post Charge (+${formatLkr(totalGrossLkr)})`}
      </button>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function PostFolioLineModal({
  isOpen,
  onClose,
  onSubmit,
  defaultPartition = "GUEST_PERSONAL",
  guestContext,
}: PostFolioLineModalProps) {
  const descId = useId();
  const amountId = useId();
  const qtyId = useId();
  const reasonId = useId();
  const notesId = useId();
  const scExemptId = useId();

  const [partition, setPartition] = useState<FolioPartition>(defaultPartition);
  const [selectedCategory, setSelectedCategory] = useState<FolioChargeCategory>("LAUNDRY");
  const [description, setDescription] = useState<string>(
    CATEGORY_PRESETS[0]?.defaultDescription ?? "",
  );
  const [unitPriceLkr, setUnitPriceLkr] = useState<number>(
    CATEGORY_PRESETS[0]?.defaultAmountLkr ?? 3500,
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isScExempt, setIsScExempt] = useState<boolean>(
    CATEGORY_PRESETS[0]?.defaultScExempt ?? false,
  );
  const [reasonCode, setReasonCode] = useState<RebateOrAdjustmentReasonCode>("SERVICE_RECOVERY");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const activePreset = useMemo(() => getCategoryPreset(selectedCategory), [selectedCategory]);

  const handleSelectPreset = (preset: CategoryPresetConfig) => {
    setSelectedCategory(preset.category);
    setDescription(preset.defaultDescription);
    setUnitPriceLkr(preset.defaultAmountLkr);
    setIsScExempt(preset.defaultScExempt);
    setValidationError(null);
  };

  const isRebate = activePreset.isRebate;
  const effectiveBaseLkr = useMemo(() => {
    const rawTotal = unitPriceLkr * quantity;
    return isRebate ? -Math.abs(rawTotal) : Math.abs(rawTotal);
  }, [unitPriceLkr, quantity, isRebate]);

  const taxBreakdown = useMemo(
    () => calculateLineTaxes(effectiveBaseLkr, isScExempt),
    [effectiveBaseLkr, isScExempt],
  );

  const isReasonRequired = isRebate || selectedCategory === "DAMAGE_BREAKAGE";

  const handleQuickAdd = (amt: number) => {
    setUnitPriceLkr((prev) => prev + amt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const error = validatePostFolioLineForm({
      description,
      unitPriceLkr,
      quantity,
      isReasonRequired,
      notes,
    });
    if (error) {
      setValidationError(error);
      return;
    }

    const payload: PostFolioLinePayload = {
      partition,
      category: selectedCategory,
      department: activePreset.defaultDepartment,
      description: description.trim(),
      quantity,
      unitPriceLkr,
      baseSupplyLkr: taxBreakdown.baseSupplyLkr,
      isServiceChargeExempt: isScExempt,
      serviceChargeLkr: taxBreakdown.serviceChargeLkr,
      tdlLkr: taxBreakdown.tdlLkr,
      ssclLkr: taxBreakdown.ssclLkr,
      vatLkr: taxBreakdown.vatLkr,
      totalGrossLkr: taxBreakdown.totalGrossLkr,
      reasonCode: isReasonRequired ? reasonCode : undefined,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isRebate ? "Post Manager Rebate / Concession" : "Post Folio Charge"}
      description={
        guestContext
          ? `${guestContext.guestFullName} • Room ${guestContext.roomNumber} (${
              guestContext.dmcContractName ?? "Direct Guest"
            })`
          : "Add incidental charges, room fees, breakage recovery, or manager rebates."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
            {validationError}
          </div>
        )}

        <PartitionSelector
          partition={partition}
          onChange={setPartition}
          dmcName={guestContext?.dmcContractName}
        />

        <CategoryPicker selectedCategory={selectedCategory} onSelect={handleSelectPreset} />

        <ChargeDetailsInputs
          descId={descId}
          qtyId={qtyId}
          description={description}
          quantity={quantity}
          onDescriptionChange={setDescription}
          onQuantityChange={setQuantity}
        />

        <UnitPriceInput
          amountId={amountId}
          unitPriceLkr={unitPriceLkr}
          onPriceChange={setUnitPriceLkr}
          onQuickAdd={handleQuickAdd}
        />

        <ServiceChargeToggle
          scExemptId={scExemptId}
          isScExempt={isScExempt}
          onToggle={setIsScExempt}
        />

        {isReasonRequired && (
          <ReasonSection
            reasonId={reasonId}
            notesId={notesId}
            reasonCode={reasonCode}
            notes={notes}
            onReasonChange={setReasonCode}
            onNotesChange={setNotes}
          />
        )}

        <LiveTaxBreakdownCard breakdown={taxBreakdown} isRebate={isRebate} />

        <ModalActions
          isSubmitting={isSubmitting}
          isRebate={isRebate}
          totalGrossLkr={taxBreakdown.totalGrossLkr}
          onClose={onClose}
        />
      </form>
    </DialogModal>
  );
}
