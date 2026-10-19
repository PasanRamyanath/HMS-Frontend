import type React from "react";
import { useState } from "react";
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

export type SeasonType = "SUPER_PEAK" | "PEAK" | "SHOULDER" | "OFF_PEAK";

export type RateAdjustmentType = "PERCENTAGE_MULTIPLIER" | "FIXED_AMOUNT_LKR" | "FIXED_AMOUNT_USD";

export interface SeasonalBand {
  readonly id: string;
  readonly name: string;
  readonly seasonType: SeasonType;
  readonly startDate: string; // YYYY-MM-DD
  readonly endDate: string; // YYYY-MM-DD
  readonly rateAdjustmentType: RateAdjustmentType;
  readonly adjustmentValue: number; // Multiplier (e.g., 1.40 for +40%) or fixed delta (+15000)
  readonly minimumStayNights: number;
  readonly isActive: boolean;
  readonly notes?: string | undefined;
}

export interface SeasonalBandsEditorProps {
  readonly initialBands?: ReadonlyArray<SeasonalBand> | undefined;
  readonly onSave?: ((bands: ReadonlyArray<SeasonalBand>) => Promise<void> | void) | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

// ============================================================================
// Sri Lankan Standard Seasonal Presets
// ============================================================================

export const SRI_LANKAN_SEASON_PRESETS: ReadonlyArray<SeasonalBand> = [
  {
    id: "preset-euro-winter-super-peak",
    name: "European Winter Super Peak (Christmas & New Year)",
    seasonType: "SUPER_PEAK",
    startDate: "2026-12-15",
    endDate: "2027-01-15",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 1.4, // +40%
    minimumStayNights: 3,
    isActive: true,
    notes: "Mandatory gala dinner supplements apply; high European charter demand.",
  },
  {
    id: "preset-euro-winter-high",
    name: "European Winter High Season",
    seasonType: "PEAK",
    startDate: "2027-01-16",
    endDate: "2027-03-31",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 1.25, // +25%
    minimumStayNights: 2,
    isActive: true,
    notes: "Prime sunny coastal season for South & West coasts.",
  },
  {
    id: "preset-avurudu-peak",
    name: "Sinhala & Tamil New Year (Bak Maha Avurudu)",
    seasonType: "SUPER_PEAK",
    startDate: "2027-04-10",
    endDate: "2027-04-18",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 1.3, // +30%
    minimumStayNights: 2,
    isActive: true,
    notes: "Domestic tourism surge across Hill Country, Down South, and Cultural Triangle.",
  },
  {
    id: "preset-esala-perahera",
    name: "Kandy Esala Perahera Festive Season",
    seasonType: "PEAK",
    startDate: "2027-07-25",
    endDate: "2027-08-10",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 1.25, // +25%
    minimumStayNights: 2,
    isActive: true,
    notes: "High demand in Kandy and Central Province; scenic train transfers.",
  },
  {
    id: "preset-sw-monsoon-low",
    name: "South-West Monsoon Off-Peak Season",
    seasonType: "OFF_PEAK",
    startDate: "2027-05-01",
    endDate: "2027-06-30",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 0.8, // -20%
    minimumStayNights: 1,
    isActive: true,
    notes: "Monsoon rains in South/West; East Coast (Arugam Bay / Pasikuda) peak offset.",
  },
  {
    id: "preset-inter-monsoon-shoulder",
    name: "Inter-Monsoon Shoulder Season",
    seasonType: "SHOULDER",
    startDate: "2027-09-01",
    endDate: "2027-10-31",
    rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
    adjustmentValue: 1.0, // Standard tariff (0% adjustment)
    minimumStayNights: 1,
    isActive: true,
    notes: "Transition window before winter migration season.",
  },
];

// ============================================================================
// Domain Calculation & Validation Functions
// ============================================================================

export function getSeasonBadgeColor(seasonType: SeasonType): StatusColor {
  switch (seasonType) {
    case "SUPER_PEAK":
      return "red";
    case "PEAK":
      return "amber";
    case "SHOULDER":
      return "blue";
    case "OFF_PEAK":
      return "green";
  }
}

export function getSeasonTypeLabel(seasonType: SeasonType): string {
  switch (seasonType) {
    case "SUPER_PEAK":
      return "Super Peak";
    case "PEAK":
      return "Peak Season";
    case "SHOULDER":
      return "Shoulder";
    case "OFF_PEAK":
      return "Off-Peak / Monsoon";
  }
}

export function validateSeasonalBand(band: Partial<SeasonalBand>): {
  isValid: boolean;
  error?: string;
} {
  if (!band.name || band.name.trim().length === 0) {
    return { isValid: false, error: "Season band name cannot be empty." };
  }

  if (!band.startDate || !band.endDate) {
    return { isValid: false, error: "Both start and end dates are required." };
  }

  if (band.startDate > band.endDate) {
    return { isValid: false, error: "Start date must precede or match end date." };
  }

  if (band.minimumStayNights === undefined || band.minimumStayNights < 1) {
    return { isValid: false, error: "Minimum stay must be at least 1 night." };
  }

  if (band.adjustmentValue === undefined || Number.isNaN(band.adjustmentValue)) {
    return { isValid: false, error: "Rate adjustment value must be a valid number." };
  }

  if (band.rateAdjustmentType === "PERCENTAGE_MULTIPLIER" && band.adjustmentValue < 0) {
    return { isValid: false, error: "Percentage multiplier cannot be negative." };
  }

  return { isValid: true };
}

export function calculateSeasonalRate(
  baseRate: number,
  band: SeasonalBand,
  currency: "LKR" | "USD",
): number {
  if (!band.isActive) {
    return baseRate;
  }

  if (band.rateAdjustmentType === "PERCENTAGE_MULTIPLIER") {
    const raw = baseRate * band.adjustmentValue;
    return currency === "LKR" ? Math.round(raw) : Math.round(raw * 100) / 100;
  }

  if (band.rateAdjustmentType === "FIXED_AMOUNT_LKR") {
    if (currency === "LKR") {
      return Math.max(0, Math.round(baseRate + band.adjustmentValue));
    }
    return baseRate;
  }

  if (band.rateAdjustmentType === "FIXED_AMOUNT_USD") {
    if (currency === "USD") {
      return Math.max(0, Math.round((baseRate + band.adjustmentValue) * 100) / 100);
    }
    return baseRate;
  }

  return baseRate;
}

export function isDateInSeasonalBand(dateIso: string, band: SeasonalBand): boolean {
  return band.isActive && dateIso >= band.startDate && dateIso <= band.endDate;
}

export function findActiveSeasonBand(
  dateIso: string,
  bands: ReadonlyArray<SeasonalBand>,
): SeasonalBand | null {
  // Sort priority: SUPER_PEAK (4) > PEAK (3) > SHOULDER (2) > OFF_PEAK (1)
  const priorityMap: Record<SeasonType, number> = {
    SUPER_PEAK: 4,
    PEAK: 3,
    SHOULDER: 2,
    OFF_PEAK: 1,
  };

  const matching = bands.filter((b) => isDateInSeasonalBand(dateIso, b));
  if (matching.length === 0) return null;

  return (
    [...matching].sort((a, b) => priorityMap[b.seasonType] - priorityMap[a.seasonType])[0] ?? null
  );
}

export function formatAdjustmentLabel(band: SeasonalBand): string {
  if (band.rateAdjustmentType === "PERCENTAGE_MULTIPLIER") {
    const deltaPercent = Math.round((band.adjustmentValue - 1.0) * 100);
    const sign = deltaPercent > 0 ? "+" : "";
    return `${sign}${deltaPercent}% (${band.adjustmentValue.toFixed(2)}x)`;
  }

  if (band.rateAdjustmentType === "FIXED_AMOUNT_LKR") {
    const sign = band.adjustmentValue >= 0 ? "+" : "";
    return `${sign}${formatLkr(band.adjustmentValue)}`;
  }

  const sign = band.adjustmentValue >= 0 ? "+" : "";
  return `${sign}$${band.adjustmentValue.toFixed(2)} USD`;
}

// ============================================================================
// Subcomponent: Seasonal Band Card
// ============================================================================

interface SeasonalBandCardProps {
  readonly band: SeasonalBand;
  readonly onEdit: (band: SeasonalBand) => void;
  readonly onDelete: (bandId: string) => void;
  readonly onToggleActive: (bandId: string) => void;
  readonly readOnly?: boolean | undefined;
}

function SeasonalBandCard({
  band,
  onEdit,
  onDelete,
  onToggleActive,
  readOnly,
}: SeasonalBandCardProps) {
  const badgeColor = getSeasonBadgeColor(band.seasonType);
  const typeLabel = getSeasonTypeLabel(band.seasonType);
  const adjustmentText = formatAdjustmentLabel(band);

  return (
    <GlassCard
      material="regular"
      radius="lg"
      className={`p-4 transition-all duration-200 border ${
        band.isActive
          ? "border-slate-200/80 dark:border-white/10"
          : "border-slate-200/40 dark:border-white/5 opacity-60"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {band.name}
            </h3>
            <StatusBadge
              status={band.seasonType}
              label={typeLabel}
              color={badgeColor}
              size="sm"
              showDot
            />
            {!band.isActive && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                Inactive
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {band.startDate} &rarr; {band.endDate}
            </span>

            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
              Adjustment:{" "}
              <strong className="text-apple-blue font-semibold tabular-nums-lkr">
                {adjustmentText}
              </strong>
            </span>

            <span>
              Min Stay:{" "}
              <strong className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums-lkr">
                {band.minimumStayNights} {band.minimumStayNights === 1 ? "night" : "nights"}
              </strong>
            </span>
          </div>

          {band.notes && (
            <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-0.5 line-clamp-1">
              {band.notes}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => onToggleActive(band.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors min-h-[36px] cursor-pointer"
            >
              {band.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => onEdit(band)}
              className="text-xs px-3 py-1.5 rounded-lg bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 font-medium transition-colors min-h-[36px] cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(band.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors min-h-[36px] cursor-pointer"
              aria-label={`Delete ${band.name}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: Add / Edit Seasonal Band Modal
// ============================================================================

interface SeasonalBandModalProps {
  readonly isOpen: boolean;
  readonly initialData: SeasonalBand | null;
  readonly onClose: () => void;
  readonly onSaveBand: (band: SeasonalBand) => void;
}

const SEASON_OPTIONS: ReadonlyArray<SegmentedControlOption<SeasonType>> = [
  { id: "SUPER_PEAK", label: "Super Peak" },
  { id: "PEAK", label: "Peak" },
  { id: "SHOULDER", label: "Shoulder" },
  { id: "OFF_PEAK", label: "Off-Peak" },
];

function SeasonalBandModal({ isOpen, initialData, onClose, onSaveBand }: SeasonalBandModalProps) {
  const [name, setName] = useState(() => initialData?.name ?? "");
  const [seasonType, setSeasonType] = useState<SeasonType>(() => initialData?.seasonType ?? "PEAK");
  const [startDate, setStartDate] = useState(
    () => initialData?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(
    () => initialData?.endDate ?? new Date().toISOString().slice(0, 10),
  );
  const [rateAdjustmentType, setRateAdjustmentType] = useState<RateAdjustmentType>(
    () => initialData?.rateAdjustmentType ?? "PERCENTAGE_MULTIPLIER",
  );
  const [adjustmentValue, setAdjustmentValue] = useState<number>(
    () => initialData?.adjustmentValue ?? 1.25,
  );
  const [minimumStayNights, setMinimumStayNights] = useState<number>(
    () => initialData?.minimumStayNights ?? 2,
  );
  const [isActive, setIsActive] = useState(() => initialData?.isActive ?? true);
  const [notes, setNotes] = useState(() => initialData?.notes ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: SeasonalBand = {
      id: initialData?.id ?? `season-${Date.now()}`,
      name: name.trim(),
      seasonType,
      startDate,
      endDate,
      rateAdjustmentType,
      adjustmentValue,
      minimumStayNights,
      isActive,
      notes: notes.trim() || undefined,
    };

    const validation = validateSeasonalBand(candidate);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Invalid seasonal configuration.");
      return;
    }

    setValidationError(null);
    onSaveBand(candidate);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Seasonal Band" : "Create New Seasonal Band"}
      description="Configure date ranges, multipliers, and minimum stay rules for Sri Lankan hospitality seasons."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
            {validationError}
          </div>
        )}

        {/* Band Name */}
        <div>
          <label
            htmlFor="season-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            Seasonal Band Name
          </label>
          <input
            id="season-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Euro Winter Peak 2026/27"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50"
          />
        </div>

        {/* Season Type Segmented Control */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            Season Tier
          </span>
          <SegmentedControl
            options={SEASON_OPTIONS}
            value={seasonType}
            onChange={(val) => setSeasonType(val)}
            fullWidth
            ariaLabel="Season Tier Selector"
          />
        </div>

        {/* Date Ranges: Native <input type="date"> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="start-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px]"
            />
          </div>
          <div>
            <label
              htmlFor="end-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px]"
            />
          </div>
        </div>

        {/* Rate Adjustment Type & Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="adj-type"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              Adjustment Method
            </label>
            <select
              id="adj-type"
              value={rateAdjustmentType}
              onChange={(e) => setRateAdjustmentType(e.target.value as RateAdjustmentType)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px]"
            >
              <option value="PERCENTAGE_MULTIPLIER">
                Percentage Multiplier (e.g. 1.25 = +25%)
              </option>
              <option value="FIXED_AMOUNT_LKR">Fixed Delta LKR (e.g. +15,000)</option>
              <option value="FIXED_AMOUNT_USD">Fixed Delta USD (e.g. +$50)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="adj-value"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              {rateAdjustmentType === "PERCENTAGE_MULTIPLIER"
                ? "Multiplier Value (1.0 = Base)"
                : "Adjustment Amount"}
            </label>
            <input
              id="adj-value"
              type="number"
              step={rateAdjustmentType === "PERCENTAGE_MULTIPLIER" ? "0.05" : "1"}
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(Number.parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px] tabular-nums-lkr font-mono"
            />
          </div>
        </div>

        {/* Minimum Stay & Active Switch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="min-stay"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
            >
              Minimum Stay (Nights)
            </label>
            <input
              id="min-stay"
              type="number"
              min={1}
              max={30}
              value={minimumStayNights}
              onChange={(e) => setMinimumStayNights(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px] tabular-nums-lkr font-mono"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 sm:pt-6">
            <label
              htmlFor="band-active"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Enable Season Band
            </label>
            <input
              id="band-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded-md text-apple-blue focus:ring-apple-blue/50 cursor-pointer"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="season-notes"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            Notes &amp; Internal Policies (Optional)
          </label>
          <input
            id="season-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Mandatory gala dinner supplements or minimum booking rules."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue/50"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-xs font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Save Seasonal Band
          </button>
        </div>
      </form>
    </DialogModal>
  );
}

// ============================================================================
// Subcomponent: Live Rate Calculator & Seasonal Simulator
// ============================================================================

interface SeasonalRateSimulatorProps {
  readonly bands: ReadonlyArray<SeasonalBand>;
}

function SeasonalRateSimulator({ bands }: SeasonalRateSimulatorProps) {
  const [testDate, setTestDate] = useState(() => "2026-12-25");
  const [baseRateLkr, setBaseRateLkr] = useState<number>(45000);
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR");

  const activeBand = findActiveSeasonBand(testDate, bands);
  const effectiveRate = activeBand
    ? calculateSeasonalRate(baseRateLkr, activeBand, currency)
    : baseRateLkr;

  return (
    <GlassCard material="regular" radius="lg" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Live Seasonal Rate Simulator
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Test any calendar date against configured seasonal multipliers.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrency("LKR")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
              currency === "LKR"
                ? "bg-apple-blue text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            LKR
          </button>
          <button
            type="button"
            onClick={() => setCurrency("USD")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
              currency === "USD"
                ? "bg-apple-blue text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            USD
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="sim-date"
            className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            Simulation Date
          </label>
          <input
            id="sim-date"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-900 dark:text-white min-h-[40px]"
          />
        </div>

        <div>
          <label
            htmlFor="sim-base"
            className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            Base Room Rate ({currency})
          </label>
          <input
            id="sim-base"
            type="number"
            value={baseRateLkr}
            onChange={(e) => setBaseRateLkr(Number.parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-900 dark:text-white min-h-[40px] tabular-nums-lkr font-mono"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Effective Seasonal Rate
          </span>
          <span className="text-base font-bold text-apple-blue tabular-nums-lkr font-mono">
            {currency === "LKR" ? formatLkr(effectiveRate) : `$${effectiveRate.toFixed(2)} USD`}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activeBand
              ? `${activeBand.name} (${formatAdjustmentLabel(activeBand)})`
              : "Standard Off-Band Tariff (1.00x)"}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Component: SeasonalBandsEditor
// ============================================================================

export function SeasonalBandsEditor({
  initialBands,
  onSave,
  isSaving = false,
  readOnly = false,
}: SeasonalBandsEditorProps) {
  const [bands, setBands] = useState<ReadonlyArray<SeasonalBand>>(
    () => initialBands ?? SRI_LANKAN_SEASON_PRESETS,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<SeasonalBand | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleOpenAdd = () => {
    setEditingBand(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (band: SeasonalBand) => {
    setEditingBand(band);
    setIsModalOpen(true);
  };

  const handleSaveBand = (band: SeasonalBand) => {
    setBands((prev) => {
      const exists = prev.some((b) => b.id === band.id);
      if (exists) {
        return prev.map((b) => (b.id === band.id ? band : b));
      }
      return [...prev, band];
    });
  };

  const handleDeleteBand = (bandId: string) => {
    setBands((prev) => prev.filter((b) => b.id !== bandId));
  };

  const handleToggleActive = (bandId: string) => {
    setBands((prev) => prev.map((b) => (b.id === bandId ? { ...b, isActive: !b.isActive } : b)));
  };

  const handleResetPresets = () => {
    setBands(SRI_LANKAN_SEASON_PRESETS);
  };

  const handleSaveAll = async () => {
    setSaveSuccess(false);
    if (onSave) {
      await onSave(bands);
      setSaveSuccess(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Seasonal Calendar Band &amp; Multiplier Editor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure Sri Lankan European Winter Peak, Sinhala &amp; Tamil New Year, Esala Perahera,
            and Monsoon off-peak rate multipliers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
              Calendar Saved
            </span>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleResetPresets}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Restore Sri Lankan Presets
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[44px] px-4 rounded-xl bg-apple-blue/10 text-apple-blue text-xs font-semibold hover:bg-apple-blue/20 transition-colors cursor-pointer"
              >
                + Add Seasonal Band
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="min-h-[44px] px-5 rounded-xl bg-apple-blue text-white text-xs font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? "Saving Calendar..." : "Save Seasonal Bands"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Simulator Card */}
      <SeasonalRateSimulator bands={bands} />

      {/* Band Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          <span>Active Seasons ({bands.length} configured)</span>
          <span>Chronological Calendar Bands</span>
        </div>

        {bands.length === 0 ? (
          <GlassCard material="regular" radius="lg" className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No seasonal bands configured.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click &quot;Restore Sri Lankan Presets&quot; or &quot;+ Add Seasonal Band&quot; to
              configure seasonal calendars.
            </p>
          </GlassCard>
        ) : (
          bands.map((band) => (
            <SeasonalBandCard
              key={band.id}
              band={band}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteBand}
              onToggleActive={handleToggleActive}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <SeasonalBandModal
          isOpen={isModalOpen}
          initialData={editingBand}
          onClose={() => setIsModalOpen(false)}
          onSaveBand={handleSaveBand}
        />
      )}
    </div>
  );
}
