import { type ChangeEvent, useId, useState } from "react";
import type { ModifierOption, TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ModifierSelectionType = "SINGLE" | "MULTIPLE";

export interface ModifierOptionItem {
  readonly id: string;
  readonly name: TrilingualText;
  readonly priceAdjustmentLkr: number;
  readonly isDefault: boolean;
}

export interface ModifierGroup {
  readonly id: string;
  readonly name: TrilingualText;
  readonly selectionType: ModifierSelectionType;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly isRequired: boolean;
  readonly options: ReadonlyArray<ModifierOptionItem>;
}

export interface ModifierGroupInputProps {
  readonly groups?: ReadonlyArray<ModifierGroup> | undefined;
  readonly onChange: (groups: ReadonlyArray<ModifierGroup>) => void;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
  readonly maxGroups?: number | undefined;
  readonly allowPresets?: boolean | undefined;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
}

// ============================================================================
// Curated Sri Lankan Hospitality Presets (Authentic Rung 2 parities)
// ============================================================================

export const PRESET_SPICE_LEVELS: ModifierGroup = {
  id: "GRP-SPICE-LEVELS",
  name: {
    en: "Spice Level",
    si: "මිරිස් සැර ප්රමාණය",
    ta: "கார அளவு",
  },
  selectionType: "SINGLE",
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [
    {
      id: "OPT-SPICE-MILD",
      name: {
        en: "Mild Tourist",
        si: "සැර රහිත / සංචාරක හිතකාමී",
        ta: "லேசான காரம்",
      },
      priceAdjustmentLkr: 0,
      isDefault: true,
    },
    {
      id: "OPT-SPICE-MEDIUM",
      name: {
        en: "Medium",
        si: "මධ්යම සැර",
        ta: "நடுத்தர காரம்",
      },
      priceAdjustmentLkr: 0,
      isDefault: false,
    },
    {
      id: "OPT-SPICE-HOT",
      name: {
        en: "Authentic Sri Lankan Spicy",
        si: "සැබෑ ශ්රී ලාංකික සැර",
        ta: "உண்மையான இலங்கை காரம்",
      },
      priceAdjustmentLkr: 0,
      isDefault: false,
    },
  ],
};

export const PRESET_BREAKFAST_EXTRAS: ModifierGroup = {
  id: "GRP-BREAKFAST-EXTRAS",
  name: {
    en: "Sri Lankan Breakfast Extras",
    si: "ශ්රී ලංකා උදෑසන ආහාර අමතර අයිතම",
    ta: "காலை உணவு கூடுதல் பொருட்கள்",
  },
  selectionType: "MULTIPLE",
  minSelections: 0,
  maxSelections: 4,
  isRequired: false,
  options: [
    {
      id: "OPT-EXTRA-EGG-HOPPER",
      name: {
        en: "+Egg Hopper",
        si: "+බිත්තර ආප්ප",
        ta: "+முட்டை ஆப்பம்",
      },
      priceAdjustmentLkr: 250,
      isDefault: false,
    },
    {
      id: "OPT-EXTRA-PRAWN-CURRY",
      name: {
        en: "+Prawn Curry",
        si: "+ඉස්සෝ කරි",
        ta: "+இறால் கறி",
      },
      priceAdjustmentLkr: 950,
      isDefault: false,
    },
    {
      id: "OPT-EXTRA-KATTA-SAMBOL",
      name: {
        en: "+Extra Katta Sambol",
        si: "+අමතර කට සම්බෝල",
        ta: "+கூடுதல் கட்டா சம்பல்",
      },
      priceAdjustmentLkr: 120,
      isDefault: false,
    },
    {
      id: "OPT-EXTRA-SEENI-SAMBOL",
      name: {
        en: "+Seeni Sambol",
        si: "+සීනි සම්බෝල",
        ta: "+சீனி சம்பல்",
      },
      priceAdjustmentLkr: 150,
      isDefault: false,
    },
  ],
};

export const PRESET_PORTION_SIZES: ModifierGroup = {
  id: "GRP-PORTION-SIZES",
  name: {
    en: "Portion Size",
    si: "ප්රමාණය",
    ta: "பங்கு அளவு",
  },
  selectionType: "SINGLE",
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [
    {
      id: "OPT-PORTION-REGULAR",
      name: {
        en: "Regular Portion",
        si: "සාමාන්ය ප්රමාණය",
        ta: "வழக்கமான பங்கு",
      },
      priceAdjustmentLkr: 0,
      isDefault: true,
    },
    {
      id: "OPT-PORTION-LARGE",
      name: {
        en: "Large Portion (+LKR 450)",
        si: "විශාල ප්රමාණය",
        ta: "பெரிய பங்கு",
      },
      priceAdjustmentLkr: 450,
      isDefault: false,
    },
    {
      id: "OPT-PORTION-SHARING",
      name: {
        en: "Family Sharing (+LKR 1,200)",
        si: "පවුලේ බෙදාහදා ගන්නා ප්රමාණය",
        ta: "குடும்பப் பங்கு",
      },
      priceAdjustmentLkr: 1200,
      isDefault: false,
    },
  ],
};

export const PRESET_RICE_VARIETIES: ModifierGroup = {
  id: "GRP-RICE-VARIETIES",
  name: {
    en: "Rice Variety Choice",
    si: "බත් වර්ගය තෝරන්න",
    ta: "சாத வகை தேர்வு",
  },
  selectionType: "SINGLE",
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [
    {
      id: "OPT-RICE-SAMBA",
      name: {
        en: "Steamed White Samba Rice",
        si: "සුදු සම්බා බත්",
        ta: "வெள்ளை சம்பா சாதம்",
      },
      priceAdjustmentLkr: 0,
      isDefault: true,
    },
    {
      id: "OPT-RICE-RED",
      name: {
        en: "Sri Lankan Red Country Rice (Suwandel)",
        si: "සුවඳැල් රතු කැකුළු බත්",
        ta: "சிவப்பு அரிசி சாதம்",
      },
      priceAdjustmentLkr: 100,
      isDefault: false,
    },
    {
      id: "OPT-RICE-YELLOW",
      name: {
        en: "Fragrant Ceylon Yellow Rice",
        si: "සුවඳැති කහ බත්",
        ta: "மஞ்சள் சாதம்",
      },
      priceAdjustmentLkr: 250,
      isDefault: false,
    },
  ],
};

export const ALL_MODIFIER_PRESETS: ReadonlyArray<ModifierGroup> = [
  PRESET_SPICE_LEVELS,
  PRESET_BREAKFAST_EXTRAS,
  PRESET_PORTION_SIZES,
  PRESET_RICE_VARIETIES,
];

// ============================================================================
// Pure Utility & Conversion Functions
// ============================================================================

export function resolveModifierTrilingual(
  text: TrilingualText | null | undefined,
  lang: SupportedLanguage,
): string {
  if (!text) return "";
  if (lang === "si" && text.si && text.si.trim().length > 0) return text.si;
  if (lang === "ta" && text.ta && text.ta.trim().length > 0) return text.ta;
  return text.en;
}

export function formatLkrPriceAdjustment(amountLkr: number): string {
  const rounded = Math.round((amountLkr + Number.EPSILON) * 100) / 100;
  if (rounded === 0) return "Included (LKR 0.00)";
  const prefix = rounded > 0 ? "+ LKR " : "- LKR ";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function createEmptyModifierOption(
  nameEn = "New Option",
  priceAdjustmentLkr = 0,
): ModifierOptionItem {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    id: `OPT-${randomSuffix}`,
    name: {
      en: nameEn,
      si: "",
      ta: "",
    },
    priceAdjustmentLkr: Math.round((priceAdjustmentLkr + Number.EPSILON) * 100) / 100,
    isDefault: false,
  };
}

export function createEmptyModifierGroup(nameEn = "Custom Modifier Group"): ModifierGroup {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    id: `GRP-${randomSuffix}`,
    name: {
      en: nameEn,
      si: "",
      ta: "",
    },
    selectionType: "SINGLE",
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [createEmptyModifierOption("Default Option", 0)],
  };
}

function validateGroupOptions(
  options: ReadonlyArray<ModifierOptionItem>,
  groupNum: number,
): string[] {
  const errors: string[] = [];
  for (let oIdx = 0; oIdx < options.length; oIdx++) {
    const opt = options[oIdx];
    if (!opt) continue;
    if (!opt.name.en || opt.name.en.trim().length === 0) {
      errors.push(`Option #${oIdx + 1} in Group #${groupNum} is missing an English name.`);
    }
    if (Number.isNaN(opt.priceAdjustmentLkr) || opt.priceAdjustmentLkr < 0) {
      errors.push(
        `Option "${opt.name.en || oIdx + 1}" price adjustment cannot be negative or invalid.`,
      );
    }
  }
  return errors;
}

function validateSingleGroup(group: ModifierGroup, groupNum: number): string[] {
  const errors: string[] = [];
  if (!group.name.en || group.name.en.trim().length === 0) {
    errors.push(`Group #${groupNum} is missing an English name.`);
  }
  if (group.options.length === 0) {
    errors.push(
      `Group #${groupNum} ("${group.name.en || "Untitled"}") must have at least one option.`,
    );
  }
  if (group.selectionType === "SINGLE" && group.maxSelections !== 1) {
    errors.push(
      `Group #${groupNum} with single-selection type must have maxSelections equal to 1.`,
    );
  }
  errors.push(...validateGroupOptions(group.options, groupNum));
  return errors;
}

export function validateModifierGroups(groups: ReadonlyArray<ModifierGroup>): ValidationResult {
  const errors: string[] = [];
  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = groups[gIdx];
    if (!group) continue;
    errors.push(...validateSingleGroup(group, gIdx + 1));
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts structured modifier groups into the flat ModifierOption array expected by GraphQL.
 */
export function flattenModifierGroupsToOptions(
  groups: ReadonlyArray<ModifierGroup>,
): ReadonlyArray<ModifierOption> {
  const flattened: ModifierOption[] = [];

  for (const group of groups) {
    for (const opt of group.options) {
      flattened.push({
        __typename: "ModifierOption",
        id: opt.id,
        name: opt.name,
        priceAdjustmentLkr: opt.priceAdjustmentLkr,
        isDefault: opt.isDefault,
      });
    }
  }

  return flattened;
}

/**
 * Reconstructs a single modifier group wrapper around flat options if loading legacy records.
 */
export function groupModifierOptions(
  options: ReadonlyArray<ModifierOption>,
  defaultGroupName = "Dish Customizations",
): ReadonlyArray<ModifierGroup> {
  if (options.length === 0) return [];

  const convertedOptions: ModifierOptionItem[] = options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    priceAdjustmentLkr: opt.priceAdjustmentLkr,
    isDefault: opt.isDefault,
  }));

  return [
    {
      id: "GRP-LEGACY-DEFAULT",
      name: {
        en: defaultGroupName,
        si: "අභිරුචි තේරීම්",
        ta: "விருப்பங்கள்",
      },
      selectionType: "MULTIPLE",
      minSelections: 0,
      maxSelections: convertedOptions.length,
      isRequired: false,
      options: convertedOptions,
    },
  ];
}

// ============================================================================
// Subcomponents (Strict Cognitive Complexity <= 12)
// ============================================================================

function getPresetEmoji(presetId: string): string {
  if (presetId.includes("SPICE")) return "Spicy";
  if (presetId.includes("BREAKFAST")) return "Kitchen";
  if (presetId.includes("PORTION")) return "Scale";
  return "Rice";
}

interface ModifierPresetsBarProps {
  readonly onApplyPreset: (preset: ModifierGroup) => void;
  readonly existingGroupIds: ReadonlySet<string>;
  readonly disabled?: boolean;
}

export function ModifierPresetsBar({
  onApplyPreset,
  existingGroupIds,
  disabled = false,
}: ModifierPresetsBarProps) {
  const { currentLanguage } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.03] p-3.5 border border-[#E2E8F0]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-800/90 flex items-center gap-1.5">
          <span>1-Click Sri Lankan Presets</span>
        </span>
        <span className="text-[11px] text-slate-500">
          Pre-seed authentic hospitality modifier combos
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ALL_MODIFIER_PRESETS.map((preset) => {
          const isAdded = existingGroupIds.has(preset.id);
          const label = resolveModifierTrilingual(preset.name, currentLanguage);
          const emoji = getPresetEmoji(preset.id);
          const btnClass = isAdded
            ? "border-emerald-500/30 bg-emerald-500/10 text-[#0B6E4F] opacity-60 cursor-not-allowed"
            : "border-[#E2E8F0] bg-slate-50 text-slate-700 hover:bg-slate-50 hover:border-amber-400/40 active:scale-95";

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || isAdded}
              onClick={() => onApplyPreset(preset)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-200 min-h-[44px] ${btnClass}`}
            >
              <span className="text-sm">{emoji}</span>
              <span>{isAdded ? `OK ${label}` : `+ ${label}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ModifierOptionRowProps {
  readonly groupId: string;
  readonly option: ModifierOptionItem;
  readonly index: number;
  readonly selectionType: ModifierSelectionType;
  readonly isReadOnly?: boolean;
  readonly onUpdateOption: (updated: ModifierOptionItem) => void;
  readonly onRemoveOption: () => void;
}

export function ModifierOptionRow({
  groupId,
  option,
  index,
  selectionType,
  isReadOnly = false,
  onUpdateOption,
  onRemoveOption,
}: ModifierOptionRowProps) {
  const inputIdBase = useId();
  const nameInputId = `${inputIdBase}-name`;
  const priceInputId = `${inputIdBase}-price`;
  const defaultToggleId = `${inputIdBase}-default`;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdateOption({
      ...option,
      name: {
        ...option.name,
        en: e.target.value,
      },
    });
  };

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    onUpdateOption({
      ...option,
      priceAdjustmentLkr: Number.isNaN(val) ? 0 : Math.max(0, val),
    });
  };

  const handleDefaultToggle = () => {
    onUpdateOption({
      ...option,
      isDefault: !option.isDefault,
    });
  };

  return (
    <div
      data-testid={`modifier-option-row-${groupId}-${option.id}`}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.04] border border-[#E2E8F0] hover:border-[#E2E8F0] transition-colors"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="text-xs font-mono text-slate-500 w-5 text-right select-none">
          {index + 1}.
        </span>

        {/* English Name Input */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor={nameInputId} className="sr-only">
            Option Name (English)
          </label>
          <input
            id={nameInputId}
            type="text"
            disabled={isReadOnly}
            value={option.name.en}
            onChange={handleNameChange}
            placeholder="e.g. +Egg Hopper or Mild Tourist"
            className="w-full px-3 py-2 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Price Adjustment */}
        <div className="flex items-center gap-1.5 w-36">
          <label htmlFor={priceInputId} className="text-xs text-slate-500 select-none">
            LKR
          </label>
          <input
            id={priceInputId}
            type="number"
            step="10"
            min="0"
            disabled={isReadOnly}
            value={option.priceAdjustmentLkr}
            onChange={handlePriceChange}
            placeholder="0.00"
            className="w-full px-2.5 py-2 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-sm text-slate-900 text-right tabular-nums-lkr focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
          />
        </div>

        {/* Default Selection Toggle */}
        <div className="flex items-center">
          <label
            htmlFor={defaultToggleId}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border select-none transition-colors min-h-[44px] ${
              option.isDefault
                ? "bg-amber-500/20 border-amber-400/40 text-amber-800"
                : "bg-slate-50 border-[#E2E8F0] text-slate-500 hover:text-slate-700"
            }`}
          >
            <input
              id={defaultToggleId}
              type={selectionType === "SINGLE" ? "radio" : "checkbox"}
              name={`default-opt-${groupId}`}
              checked={option.isDefault}
              onChange={handleDefaultToggle}
              disabled={isReadOnly}
              className="sr-only"
            />
            <span>{option.isDefault ? "* Default" : "Set Default"}</span>
          </label>
        </div>

        {/* Delete Option */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onRemoveOption}
            aria-label={`Remove option ${option.name.en}`}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-800 hover:bg-rose-500/10 transition-colors"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface ModifierGroupCardProps {
  readonly group: ModifierGroup;
  readonly index: number;
  readonly isReadOnly?: boolean;
  readonly onUpdateGroup: (updated: ModifierGroup) => void;
  readonly onRemoveGroup: () => void;
  readonly onMoveUp?: (() => void) | undefined;
  readonly onMoveDown?: (() => void) | undefined;
}

export function ModifierGroupCard({
  group,
  index,
  isReadOnly = false,
  onUpdateGroup,
  onRemoveGroup,
  onMoveUp,
  onMoveDown,
}: ModifierGroupCardProps) {
  const cardIdBase = useId();
  const titleInputId = `${cardIdBase}-group-title`;
  const selectionTypeId = `${cardIdBase}-selection-type`;
  const requiredToggleId = `${cardIdBase}-required-toggle`;
  const [activeLangTab, setActiveLangTab] = useState<"en" | "si" | "ta">("en");

  const handleTitleChange = (lang: "en" | "si" | "ta", value: string) => {
    onUpdateGroup({
      ...group,
      name: {
        ...group.name,
        [lang]: value,
      },
    });
  };

  const handleSelectionTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ModifierSelectionType;
    const isSingle = val === "SINGLE";
    onUpdateGroup({
      ...group,
      selectionType: val,
      minSelections: isSingle ? 1 : group.minSelections,
      maxSelections: isSingle ? 1 : Math.max(1, group.options.length),
    });
  };

  const handleRequiredToggle = () => {
    const nextRequired = !group.isRequired;
    onUpdateGroup({
      ...group,
      isRequired: nextRequired,
      minSelections: nextRequired ? 1 : 0,
    });
  };

  const handleAddOption = () => {
    const newOpt = createEmptyModifierOption("New Option", 0);
    onUpdateGroup({
      ...group,
      options: [...group.options, newOpt],
    });
  };

  const handleUpdateOption = (optIndex: number, updated: ModifierOptionItem) => {
    const nextOptions = [...group.options];
    // If single choice and updated to default, unmark others
    if (group.selectionType === "SINGLE" && updated.isDefault) {
      for (let i = 0; i < nextOptions.length; i++) {
        const existing = nextOptions[i];
        if (existing && i !== optIndex) {
          nextOptions[i] = { ...existing, isDefault: false };
        }
      }
    }
    nextOptions[optIndex] = updated;
    onUpdateGroup({
      ...group,
      options: nextOptions,
    });
  };

  const handleRemoveOption = (optIndex: number) => {
    const nextOptions = group.options.filter((_, idx) => idx !== optIndex);
    onUpdateGroup({
      ...group,
      options: nextOptions,
    });
  };

  return (
    <div
      data-testid={`modifier-group-card-${group.id}`}
      className="flex flex-col gap-4 p-5 rounded-2xl bg-white backdrop-blur-xl border border-[#E2E8F0] shadow-2xl transition-all"
    >
      {/* Group Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-800 font-mono text-xs font-semibold select-none">
            {index + 1}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900">
              {group.name.en || "Untitled Modifier Group"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono tracking-tight bg-slate-50 text-slate-700">
              {group.selectionType === "SINGLE" ? "Single Choice" : "Multi Add-Ons"}
            </span>
            {group.isRequired && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/20 border border-rose-400/30 text-rose-800">
                Required
              </span>
            )}
          </div>
        </div>

        {/* Group Controls (Move, Delete) */}
        {!isReadOnly && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                aria-label="Move group up"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                ▲
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                aria-label="Move group down"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                ▼
              </button>
            )}
            <button
              type="button"
              onClick={onRemoveGroup}
              aria-label={`Remove modifier group ${group.name.en}`}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-800 hover:bg-rose-500/10 transition-colors"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Group Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Trilingual Title Tabs & Input */}
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={titleInputId} className="text-xs font-medium text-slate-700">
              Group Title ({activeLangTab.toUpperCase()})
            </label>
            <div className="flex items-center gap-1">
              {(["en", "si", "ta"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLangTab(lang)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    activeLangTab === lang
                      ? "bg-amber-400/20 text-amber-800 border border-amber-400/30"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <input
            id={titleInputId}
            type="text"
            disabled={isReadOnly}
            value={group.name[activeLangTab] ?? ""}
            onChange={(e) => handleTitleChange(activeLangTab, e.target.value)}
            placeholder={`Enter title in ${activeLangTab.toUpperCase()}`}
            className="w-full px-3 py-2 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
          />
        </div>

        {/* Selection Type & Required Toggle */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectionTypeId} className="text-xs font-medium text-slate-700">
            Selection Logic
          </label>
          <div className="flex items-center gap-2">
            <select
              id={selectionTypeId}
              disabled={isReadOnly}
              value={group.selectionType}
              onChange={handleSelectionTypeChange}
              className="flex-1 px-3 py-2 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
            >
              <option value="SINGLE">Single Choice (Radio)</option>
              <option value="MULTIPLE">Multiple Add-Ons (Checkbox)</option>
            </select>

            <label
              htmlFor={requiredToggleId}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border select-none transition-colors min-h-[44px] ${
                group.isRequired
                  ? "bg-rose-500/20 border-rose-400/30 text-rose-800"
                  : "bg-slate-50 border-[#E2E8F0] text-slate-500 hover:text-slate-700"
              }`}
            >
              <input
                id={requiredToggleId}
                type="checkbox"
                checked={group.isRequired}
                onChange={handleRequiredToggle}
                disabled={isReadOnly}
                className="sr-only"
              />
              <span>Req</span>
            </label>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Options & Extras ({group.options.length})
          </span>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 border border-[#E2E8F0] text-amber-800 hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              <span>+ Add Option</span>
            </button>
          )}
        </div>

        {group.options.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-[#E2E8F0] text-center text-xs text-slate-500">
            No options defined. Click "+ Add Option" above to create one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {group.options.map((option, optIdx) => (
              <ModifierOptionRow
                key={option.id}
                groupId={group.id}
                option={option}
                index={optIdx}
                selectionType={group.selectionType}
                isReadOnly={isReadOnly}
                onUpdateOption={(updated) => handleUpdateOption(optIdx, updated)}
                onRemoveOption={() => handleRemoveOption(optIdx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main ModifierGroupInput Component
// ============================================================================

export function ModifierGroupInput({
  groups = [],
  onChange,
  readOnly = false,
  className = "",
  maxGroups = 10,
  allowPresets = true,
}: ModifierGroupInputProps) {
  const existingGroupIds = new Set(groups.map((g) => g.id));
  const isMaxReached = groups.length >= maxGroups;

  const handleApplyPreset = (preset: ModifierGroup) => {
    if (isMaxReached) return;
    onChange([...groups, preset]);
  };

  const handleAddNewGroup = () => {
    if (isMaxReached) return;
    const newGroup = createEmptyModifierGroup("Custom Options");
    onChange([...groups, newGroup]);
  };

  const handleUpdateGroup = (index: number, updated: ModifierGroup) => {
    const next = [...groups];
    next[index] = updated;
    onChange(next);
  };

  const handleRemoveGroup = (index: number) => {
    const next = groups.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleMoveGroup = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= groups.length) return;
    const curr = groups[index];
    const target = groups[targetIdx];
    if (!curr || !target) return;
    const next = [...groups];
    next[index] = target;
    next[targetIdx] = curr;
    onChange(next);
  };

  const totalOptionsCount = groups.reduce((acc, g) => acc + g.options.length, 0);

  return (
    <div data-testid="modifier-group-input" className={`flex flex-col gap-4 ${className}`}>
      {/* Top Header & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>Dish Modifiers & Add-Ons</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-400/10 text-amber-800 border border-amber-400/20">
              {groups.length} {groups.length === 1 ? "group" : "groups"} • {totalOptionsCount}{" "}
              options
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure spice levels, portion sizing, and paid side add-ons for QR room ordering.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            disabled={isMaxReached}
            onClick={handleAddNewGroup}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all min-h-[44px] ${
              isMaxReached
                ? "bg-slate-50 border border-[#E2E8F0] text-slate-500 cursor-not-allowed"
                : " text-slate-950 hover:brightness-110 active:scale-95"
            }`}
          >
            <span>+</span>
            <span>New Custom Group</span>
          </button>
        )}
      </div>

      {/* 1-Click Sri Lankan Presets Bar */}
      {allowPresets && !readOnly && (
        <ModifierPresetsBar
          onApplyPreset={handleApplyPreset}
          existingGroupIds={existingGroupIds}
          disabled={isMaxReached}
        />
      )}

      {/* Group List / Empty State */}
      {groups.length === 0 ? (
        <div
          data-testid="modifier-empty-state"
          className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.02] border border-dashed border-[#E2E8F0] text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-xl mb-3">
            Spicy
          </div>
          <h4 className="text-sm font-semibold text-white">No Modifier Groups Added</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Allow guests to customize this dish by choosing spice levels or ordering extras like
            +Egg Hopper (LKR 250) or +Prawn Curry (LKR 950).
          </p>
          {!readOnly && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleApplyPreset(PRESET_SPICE_LEVELS)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-[#E2E8F0] text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                <span>Spicy</span>
                <span>Add Spice Levels</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(PRESET_BREAKFAST_EXTRAS)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-[#E2E8F0] text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                <span>Add Breakfast Extras</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, idx) => (
            <ModifierGroupCard
              key={group.id}
              group={group}
              index={idx}
              isReadOnly={readOnly}
              onUpdateGroup={(updated) => handleUpdateGroup(idx, updated)}
              onRemoveGroup={() => handleRemoveGroup(idx)}
              onMoveUp={idx > 0 && !readOnly ? () => handleMoveGroup(idx, "up") : undefined}
              onMoveDown={
                idx < groups.length - 1 && !readOnly
                  ? () => handleMoveGroup(idx, "down")
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
