import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { DEFAULT_DMC_CONTRACTS, type DmcContract } from "./DmcContractManager.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type DmcVoucherStatus = "VERIFIED" | "PENDING_VERIFICATION" | "REJECTED" | "DRAFT";

export interface DmcVoucherData {
  readonly contractId: string;
  readonly contractCode: string;
  readonly companyName: string;
  readonly voucherNumber: string;
  readonly tourReference: string;
  readonly guideName: string;
  readonly guidePhone?: string | undefined;
  readonly paxCount: number;
  readonly mealPlanVoucher: "RO" | "BB" | "HB" | "FB" | "AI";
  readonly roomTypeVoucher?: string | undefined;
  readonly voucherScanUrl?: string | undefined;
  readonly masterFolioTarget: "DMC_CITY_LEDGER";
  readonly guestFolioTarget: "GUEST_EXTRAS";
  readonly splitFolioConfigured: boolean;
  readonly verificationStatus: DmcVoucherStatus;
  readonly verificationNotes?: string | undefined;
  readonly isValid: boolean;
  readonly errorMessage?: string | undefined;
}

export interface DmcVoucherPanelProps {
  readonly value?: Partial<DmcVoucherData> | undefined;
  readonly onChange?: ((data: DmcVoucherData) => void) | undefined;
  readonly contracts?: ReadonlyArray<DmcContract> | undefined;
  readonly onVerify?: ((voucherNumber: string, status: DmcVoucherStatus) => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function validateDmcVoucher(voucher: Partial<DmcVoucherData>): {
  readonly isValid: boolean;
  readonly error?: string | undefined;
} {
  if (!voucher.contractId) {
    return { isValid: false, error: "Please select a Destination Management Company" };
  }
  if (!voucher.voucherNumber || voucher.voucherNumber.trim().length < 3) {
    return { isValid: false, error: "Physical DMC voucher number is required" };
  }
  if (!voucher.tourReference || voucher.tourReference.trim().length < 2) {
    return { isValid: false, error: "Tour booking reference code is required" };
  }
  if (!voucher.guideName || voucher.guideName.trim().length < 2) {
    return { isValid: false, error: "Tour guide or chauffeur name is required" };
  }
  return { isValid: true };
}

export function buildSplitFolioSummary(companyName: string, mealPlan: string): string {
  const name = companyName.trim() || "Tour Operator";
  return `100% Room & ${mealPlan} board basis billed to ${name} City Ledger. All extras, minibar & spa to Guest personal folio.`;
}

function getVoucherStatusColor(status: DmcVoucherStatus): StatusColor {
  switch (status) {
    case "VERIFIED":
      return "green";
    case "PENDING_VERIFICATION":
      return "amber";
    case "REJECTED":
      return "red";
    default:
      return "gray";
  }
}

function buildVoucherPacket(
  params: {
    readonly contractId: string;
    readonly voucherNumber: string;
    readonly tourReference: string;
    readonly guideName: string;
    readonly guidePhone: string;
    readonly paxCount: number;
    readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
    readonly roomType: string;
    readonly scanUrl: string;
    readonly status: DmcVoucherStatus;
    readonly notes: string;
  },
  contracts: ReadonlyArray<DmcContract>,
): DmcVoucherData {
  const contract = contracts.find((c) => c.id === params.contractId);
  const companyName = contract?.companyName ?? "";
  const contractCode = contract?.contractCode ?? "";

  const validation = validateDmcVoucher({
    contractId: params.contractId,
    voucherNumber: params.voucherNumber,
    tourReference: params.tourReference,
    guideName: params.guideName,
  });

  return {
    contractId: params.contractId,
    contractCode,
    companyName,
    voucherNumber: params.voucherNumber.trim().toUpperCase(),
    tourReference: params.tourReference.trim().toUpperCase(),
    guideName: params.guideName.trim(),
    guidePhone: params.guidePhone.trim() || undefined,
    paxCount: Math.max(1, params.paxCount),
    mealPlanVoucher: params.mealPlan,
    roomTypeVoucher: params.roomType.trim() || undefined,
    voucherScanUrl: params.scanUrl.trim() || undefined,
    masterFolioTarget: "DMC_CITY_LEDGER",
    guestFolioTarget: "GUEST_EXTRAS",
    splitFolioConfigured: Boolean(contract),
    verificationStatus: params.status,
    verificationNotes: params.notes.trim() || undefined,
    isValid: validation.isValid,
    errorMessage: validation.error,
  };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface VoucherHeaderProps {
  readonly voucherNumber: string;
  readonly status: DmcVoucherStatus;
}

function VoucherHeader({ voucherNumber, status }: VoucherHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          DMC Exchange Voucher
        </span>
        {voucherNumber && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono font-medium">
            {voucherNumber}
          </span>
        )}
      </div>

      <StatusBadge
        status={status}
        label={status.replace("_", " ")}
        color={getVoucherStatusColor(status)}
        size="sm"
      />
    </div>
  );
}

interface PartnerPickerProps {
  readonly contracts: ReadonlyArray<DmcContract>;
  readonly selectedContractId: string;
  readonly disabled: boolean;
  readonly onSelectContract: (contractId: string) => void;
}

function PartnerPicker({
  contracts,
  selectedContractId,
  disabled,
  onSelectContract,
}: PartnerPickerProps) {
  const pickerId = useId();
  const selected = contracts.find((c) => c.id === selectedContractId);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={pickerId}
          className="block text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          Tour Operator / DMC Contract *
        </label>
        {selected && (
          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
            Terms: {selected.creditDays} Days Net ({selected.settlementCurrency})
          </span>
        )}
      </div>

      <select
        id={pickerId}
        value={selectedContractId}
        disabled={disabled}
        onChange={(e) => onSelectContract(e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">-- Select Destination Management Company --</option>
        {contracts.map((contract) => (
          <option key={contract.id} value={contract.id}>
            {contract.companyName} ({contract.contractCode})
          </option>
        ))}
      </select>
    </div>
  );
}

interface VoucherInputsProps {
  readonly voucherNumber: string;
  readonly tourRef: string;
  readonly guideName: string;
  readonly guidePhone: string;
  readonly paxCount: number;
  readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
  readonly disabled: boolean;
  readonly onChangeField: (field: string, val: unknown) => void;
}

function VoucherInputs({
  voucherNumber,
  tourRef,
  guideName,
  guidePhone,
  paxCount,
  mealPlan,
  disabled,
  onChangeField,
}: VoucherInputsProps) {
  const vchId = useId();
  const refId = useId();
  const guideId = useId();
  const phoneId = useId();
  const paxId = useId();
  const mealId = useId();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={vchId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Physical Voucher Number *
          </label>
          <input
            id={vchId}
            type="text"
            value={voucherNumber}
            disabled={disabled}
            onChange={(e) => onChangeField("voucherNumber", e.target.value)}
            placeholder="e.g. AST-2026-VCH-88219"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono uppercase min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor={refId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Tour Booking Reference *
          </label>
          <input
            id={refId}
            type="text"
            value={tourRef}
            disabled={disabled}
            onChange={(e) => onChangeField("tourReference", e.target.value)}
            placeholder="e.g. KUONI-UK-RT-4029"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono uppercase min-h-[44px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={guideId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Tour Guide / Escort Name *
          </label>
          <input
            id={guideId}
            type="text"
            value={guideName}
            disabled={disabled}
            onChange={(e) => onChangeField("guideName", e.target.value)}
            placeholder="e.g. Sunil Jayawardena (NTG)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor={phoneId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Guide Mobile Number
          </label>
          <input
            id={phoneId}
            type="tel"
            value={guidePhone}
            disabled={disabled}
            onChange={(e) => onChangeField("guidePhone", e.target.value)}
            placeholder="e.g. 0771234567"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono min-h-[44px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={paxId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Voucher Guest Count (Pax)
          </label>
          <input
            id={paxId}
            type="number"
            min={1}
            value={paxCount}
            disabled={disabled}
            onChange={(e) => onChangeField("paxCount", Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 font-mono min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor={mealId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Contracted Meal Plan (Voucher Basis)
          </label>
          <select
            id={mealId}
            value={mealPlan}
            disabled={disabled}
            onChange={(e) =>
              onChangeField("mealPlan", e.target.value as "RO" | "BB" | "HB" | "FB" | "AI")
            }
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 min-h-[44px]"
          >
            <option value="RO">Room Only (RO)</option>
            <option value="BB">Bed & Breakfast (BB)</option>
            <option value="HB">Half Board (HB) - Dinner Included</option>
            <option value="FB">Full Board (FB) - Lunch & Dinner</option>
            <option value="AI">All Inclusive (AI)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface ScanUploadProps {
  readonly scanUrl: string;
  readonly disabled: boolean;
  readonly onScanChange: (url: string) => void;
}

function ScanUploadSection({ scanUrl, disabled, onScanChange }: ScanUploadProps) {
  const scanInputId = useId();

  return (
    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <label
          htmlFor={scanInputId}
          className="block text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          Physical Voucher Scan Attachment (WebP / PDF)
        </label>
        {scanUrl && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Scan Attached
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          id={scanInputId}
          type="text"
          value={scanUrl}
          disabled={disabled}
          onChange={(e) => onScanChange(e.target.value)}
          placeholder="Enter image URL or upload voucher scan..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white min-h-[44px]"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onScanChange("https://cdn.slhms.lk/vouchers/scan-sample.webp")}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap min-h-[44px]"
        >
          Attach Scan
        </button>
      </div>
    </div>
  );
}

interface RoutingCardProps {
  readonly companyName: string;
  readonly mealPlan: string;
}

function SplitFolioRoutingCard({ companyName, mealPlan }: RoutingCardProps) {
  const summary = buildSplitFolioSummary(companyName, mealPlan);

  return (
    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-500/20 space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-blue-900 dark:text-blue-200">
          Automated Split-Folio Routing Active
        </span>
        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono text-[11px]">
          DMC City Ledger
        </span>
      </div>
      <p className="text-blue-700 dark:text-blue-300 leading-relaxed text-[11px]">{summary}</p>
    </div>
  );
}

interface VerificationActionsProps {
  readonly disabled: boolean;
  readonly canVerify: boolean;
  readonly onVerify: (status: DmcVoucherStatus) => void;
}

function VerificationActions({ disabled, canVerify, onVerify }: VerificationActionsProps) {
  if (disabled) return null;

  return (
    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
      <button
        type="button"
        onClick={() => onVerify("REJECTED")}
        className="px-3 py-2 text-xs rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors min-h-[44px]"
      >
        Flag Discrepancy
      </button>

      <button
        type="button"
        disabled={!canVerify}
        onClick={() => onVerify("VERIFIED")}
        className="px-4 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-colors min-h-[44px]"
      >
        Verify & Approve Voucher
      </button>
    </div>
  );
}

interface VoucherFormState {
  readonly contractId: string;
  readonly voucherNumber: string;
  readonly tourReference: string;
  readonly guideName: string;
  readonly guidePhone: string;
  readonly paxCount: number;
  readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
  readonly scanUrl: string;
  readonly status: DmcVoucherStatus;
}

// ============================================================================
// Main Component
// ============================================================================

export function DmcVoucherPanel({
  value,
  onChange,
  contracts = DEFAULT_DMC_CONTRACTS,
  onVerify,
  disabled = false,
  className = "",
}: DmcVoucherPanelProps) {
  const [form, setForm] = useState<VoucherFormState>(() => ({
    contractId: value?.contractId ?? "",
    voucherNumber: value?.voucherNumber ?? "",
    tourReference: value?.tourReference ?? "",
    guideName: value?.guideName ?? "",
    guidePhone: value?.guidePhone ?? "",
    paxCount: value?.paxCount ?? 2,
    mealPlan: value?.mealPlanVoucher ?? "HB",
    scanUrl: value?.voucherScanUrl ?? "",
    status: value?.verificationStatus ?? "PENDING_VERIFICATION",
  }));

  const roomType = value?.roomTypeVoucher ?? "";
  const notes = value?.verificationNotes ?? "";

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === form.contractId),
    [contracts, form.contractId],
  );

  const updateField = (field: string, val: unknown) => {
    const next = { ...form, [field]: val };
    setForm(next);
    const packet = buildVoucherPacket(
      {
        contractId: next.contractId,
        voucherNumber: next.voucherNumber,
        tourReference: next.tourReference,
        guideName: next.guideName,
        guidePhone: next.guidePhone,
        paxCount: next.paxCount,
        mealPlan: next.mealPlan,
        roomType,
        scanUrl: next.scanUrl,
        status: next.status,
        notes,
      },
      contracts,
    );
    onChange?.(packet);
  };

  const handleVerify = (newStatus: DmcVoucherStatus) => {
    updateField("status", newStatus);
    if (form.voucherNumber) {
      onVerify?.(form.voucherNumber, newStatus);
    }
  };

  const canVerify = Boolean(form.voucherNumber && form.contractId);

  return (
    <GlassCard material="thin" radius="lg" className={`p-4 space-y-4 ${className}`}>
      <VoucherHeader voucherNumber={form.voucherNumber} status={form.status} />

      <PartnerPicker
        contracts={contracts}
        selectedContractId={form.contractId}
        disabled={disabled}
        onSelectContract={(id) => updateField("contractId", id)}
      />

      <VoucherInputs
        voucherNumber={form.voucherNumber}
        tourRef={form.tourReference}
        guideName={form.guideName}
        guidePhone={form.guidePhone}
        paxCount={form.paxCount}
        mealPlan={form.mealPlan}
        disabled={disabled}
        onChangeField={updateField}
      />

      <ScanUploadSection
        scanUrl={form.scanUrl}
        disabled={disabled}
        onScanChange={(url) => updateField("scanUrl", url)}
      />

      <SplitFolioRoutingCard
        companyName={selectedContract?.companyName ?? ""}
        mealPlan={form.mealPlan}
      />

      <VerificationActions disabled={disabled} canVerify={canVerify} onVerify={handleVerify} />
    </GlassCard>
  );
}
