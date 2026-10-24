import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { type GuestDish, formatLkr, resolveDishText } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface ModifierOption {
  readonly id: string;
  readonly name: {
    readonly en: string;
    readonly si?: string | undefined;
    readonly ta?: string | undefined;
  };
  readonly priceAdjustmentLkr: number;
  readonly isDefault?: boolean | undefined;
}

interface ModifierGroupConfig {
  readonly id: string;
  readonly title: {
    readonly en: string;
    readonly si?: string | undefined;
    readonly ta?: string | undefined;
  };
  readonly isRequired?: boolean | undefined;
  readonly allowMultiple?: boolean | undefined;
  readonly options: ReadonlyArray<ModifierOption>;
}

export interface GuestCustomizedDish {
  readonly dishId: string;
  readonly dishName: string;
  readonly basePriceLkr: number;
  readonly selectedPortion?: ModifierOption | undefined;
  readonly selectedSpiceLevel?: ModifierOption | undefined;
  readonly selectedAddOns: ReadonlyArray<ModifierOption>;
  readonly dietaryPreferences: ReadonlyArray<string>;
  readonly specialInstructions?: string | undefined;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly totalPriceLkr: number;
}

export interface DishModifierSheetProps {
  readonly isOpen: boolean;
  readonly dish: GuestDish | null;
  readonly initialQuantity?: number | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onClose: () => void;
  readonly onConfirm: (customized: GuestCustomizedDish) => void;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Modifier Groups for Sri Lankan Resort Dishes
// ============================================================================

export const DEFAULT_PORTIONS: ModifierGroupConfig = {
  id: "GRP-PORTIONS",
  title: {
    en: "Portion Size",
    si: "ප්රමාණය",
    ta: "பகுதி அளவு",
  },
  isRequired: true,
  allowMultiple: false,
  options: [
    {
      id: "PORTION-REGULAR",
      name: { en: "Regular (Standard)", si: "සාමාන්ය ප්රමාණය", ta: "சாதாரண அளவு" },
      priceAdjustmentLkr: 0,
      isDefault: true,
    },
    {
      id: "PORTION-LARGE",
      name: { en: "Large / Sharing (+LKR 650)", si: "විශාල ප්රමාණය", ta: "பெரிய அளவு" },
      priceAdjustmentLkr: 650,
      isDefault: false,
    },
  ],
};

export const DEFAULT_SPICE_LEVELS: ModifierGroupConfig = {
  id: "GRP-SPICE",
  title: {
    en: "Spice Preference",
    si: "මිරිස් සැර මට්ටම",
    ta: "கார விருப்பம்",
  },
  isRequired: true,
  allowMultiple: false,
  options: [
    {
      id: "SPICE-MILD",
      name: { en: "Mild / Low Spice", si: "සැර රහිත / සංචාරක හිතකාමී", ta: "குறைந்த காரம்" },
      priceAdjustmentLkr: 0,
      isDefault: false,
    },
    {
      id: "SPICE-MEDIUM",
      name: { en: "Medium Spice", si: "මධ්යම සැර", ta: "நடுத்தர காரம்" },
      priceAdjustmentLkr: 0,
      isDefault: true,
    },
    {
      id: "SPICE-HOT",
      name: { en: "Authentic Sri Lankan Hot", si: "සැබෑ ලාංකික සැර", ta: "இலங்கை காரம்" },
      priceAdjustmentLkr: 0,
      isDefault: false,
    },
  ],
};

export const DEFAULT_ADDONS: ModifierGroupConfig = {
  id: "GRP-ADDONS",
  title: {
    en: "Popular Add-Ons & Extras",
    si: "අමතර අයිතම",
    ta: "கூடுதல் பொருட்கள்",
  },
  isRequired: false,
  allowMultiple: true,
  options: [
    {
      id: "ADDON-EGG-HOPPER",
      name: { en: "+Extra Egg Hopper", si: "+අමතර බිත්තර ආප්පයක්", ta: "+முட்டை ஆப்பம்" },
      priceAdjustmentLkr: 350,
    },
    {
      id: "ADDON-POL-SAMBOL",
      name: { en: "+Pol Sambol Cup", si: "+පොල් සම්බෝල කෝප්පයක්", ta: "+தேங்காய் சம்பல்" },
      priceAdjustmentLkr: 200,
    },
    {
      id: "ADDON-CURRY-GRAVY",
      name: { en: "+Clay-Pot Fish Gravy", si: "+මාළු හොදි කෝප්පයක්", ta: "+மீன் குழம்பு" },
      priceAdjustmentLkr: 250,
    },
    {
      id: "ADDON-ROAST-PAAN",
      name: { en: "+Kurakkan Roast Paan (2 pcs)", si: "+කුරක්කන් රෝස් පාන්", ta: "+ரோஸ்ட் பாண்" },
      priceAdjustmentLkr: 300,
    },
  ],
};

const QUICK_DIETARY_CHIPS: ReadonlyArray<{
  readonly id: string;
  readonly label: { en: string; si: string; ta: string };
}> = [
  {
    id: "NO_MSG",
    label: { en: "No MSG", si: "MSG රහිතව", ta: "அஜினோமோட்டோ இல்லை" },
  },
  {
    id: "LESS_SALT",
    label: { en: "Less Salt", si: "ලුණු අඩුවෙන්", ta: "குறைந்த உப்பு" },
  },
  {
    id: "SEPARATE_GRAVY",
    label: { en: "Gravy on the Side", si: "හොදි වෙනම", ta: "குழம்பு தனியாக" },
  },
  {
    id: "NO_ONION_GARLIC",
    label: { en: "No Onion/Garlic", si: "ලූණු/සුදුලූණු රහිත", ta: "வெங்காயம்/பூண்டு இல்லை" },
  },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function calculateCustomizedDishPrice(
  basePriceLkr: number,
  portion: ModifierOption | undefined,
  addOns: ReadonlyArray<ModifierOption>,
  quantity: number,
): { unitPriceLkr: number; totalPriceLkr: number } {
  const portionAdjustment = portion?.priceAdjustmentLkr ?? 0;
  const addOnsTotal = addOns.reduce((acc, opt) => acc + opt.priceAdjustmentLkr, 0);
  const unitPriceLkr = Math.max(0, basePriceLkr + portionAdjustment + addOnsTotal);
  const totalPriceLkr = unitPriceLkr * Math.max(1, quantity);
  return { unitPriceLkr, totalPriceLkr };
}

export function resolveModifierText(
  name: { en: string; si?: string | undefined; ta?: string | undefined },
  lang: SupportedLanguage = "en",
): string {
  if (lang === "si" && name.si?.trim()) return name.si.trim();
  if (lang === "ta" && name.ta?.trim()) return name.ta.trim();
  return name.en;
}

// ============================================================================
// Subcomponents (Apple HIG & Cognitive Complexity <= 12)
// ============================================================================

interface RadioGroupProps {
  readonly config: ModifierGroupConfig;
  readonly selectedOptionId: string;
  readonly language: SupportedLanguage;
  readonly onSelect: (option: ModifierOption) => void;
}

function ModifierRadioGroup({ config, selectedOptionId, language, onSelect }: RadioGroupProps) {
  const title = resolveModifierText(config.title, language);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</span>
        {config.isRequired && (
          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
            Required
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {config.options.map((opt) => {
          const isSelected = opt.id === selectedOptionId;
          const optName = resolveModifierText(opt.name, language);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt)}
              aria-pressed={isSelected}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all duration-200 ease-apple-spring select-none cursor-pointer ${
                isSelected
                  ? "bg-orange-500/10 border-orange-500 text-orange-950 shadow-xs"
                  : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 "
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? "border-orange-500 bg-orange-500" : "border-slate-400"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-xs font-semibold text-left">{optName}</span>
              </div>

              {opt.priceAdjustmentLkr > 0 && (
                <span className="text-xs font-bold tabular-nums text-slate-900 ">
                  +{formatLkr(opt.priceAdjustmentLkr)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AddOnsProps {
  readonly config: ModifierGroupConfig;
  readonly selectedAddOnIds: ReadonlySet<string>;
  readonly language: SupportedLanguage;
  readonly onToggle: (option: ModifierOption) => void;
}

function ModifierAddOnsList({ config, selectedAddOnIds, language, onToggle }: AddOnsProps) {
  const title = resolveModifierText(config.title, language);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-slate-500 ">Optional</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {config.options.map((opt) => {
          const isSelected = selectedAddOnIds.has(opt.id);
          const optName = resolveModifierText(opt.name, language);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={isSelected}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all duration-200 ease-apple-spring select-none cursor-pointer ${
                isSelected
                  ? "bg-orange-500/10 border-orange-500 text-orange-950 shadow-xs"
                  : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 "
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-400"
                  }`}
                >
                  {isSelected && (
                    <span className="text-[10px] font-bold">
                      <svg
                        className="w-4 h-4 inline-block shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span className="sr-only">OK</span>
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-left">{optName}</span>
              </div>

              <span className="text-xs font-bold tabular-nums text-slate-900 ">
                +{formatLkr(opt.priceAdjustmentLkr)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DietaryChipsProps {
  readonly selectedChips: ReadonlySet<string>;
  readonly language: SupportedLanguage;
  readonly onToggle: (id: string) => void;
}

function DietaryPreferenceChips({ selectedChips, language, onToggle }: DietaryChipsProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
        Preparation & Dietary Preferences
      </span>

      <div className="flex flex-wrap gap-2">
        {QUICK_DIETARY_CHIPS.map((chip) => {
          const isSelected = selectedChips.has(chip.id);
          const label =
            language === "si" ? chip.label.si : language === "ta" ? chip.label.ta : chip.label.en;

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggle(chip.id)}
              aria-pressed={isSelected}
              className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ease-apple-spring select-none cursor-pointer ${
                isSelected
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                  : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
              }`}
            >
              {isSelected ? `OK ${label}` : `+ ${label}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: DishModifierSheet
// ============================================================================

export function DishModifierSheet({
  isOpen,
  dish,
  initialQuantity = 1,
  language = "en",
  onClose,
  onConfirm,
  className = "",
}: DishModifierSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Selected options state
  const [selectedPortion, setSelectedPortion] = useState<ModifierOption>(
    DEFAULT_PORTIONS.options[0] ?? {
      id: "PORTION-REGULAR",
      name: { en: "Regular" },
      priceAdjustmentLkr: 0,
    },
  );
  const [selectedSpice, setSelectedSpice] = useState<ModifierOption>(
    DEFAULT_SPICE_LEVELS.options[1] ?? {
      id: "SPICE-MEDIUM",
      name: { en: "Medium" },
      priceAdjustmentLkr: 0,
    },
  );
  const [selectedAddOnMap, setSelectedAddOnMap] = useState<Map<string, ModifierOption>>(new Map());
  const [selectedDietaryChips, setSelectedDietaryChips] = useState<Set<string>>(new Set());
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(Math.max(1, initialQuantity));

  // Sync dialog visibility
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Reset state when dish changes
  useEffect(() => {
    if (dish) {
      setQuantity(Math.max(1, initialQuantity));
      setSelectedAddOnMap(new Map());
      setSelectedDietaryChips(new Set());
      setSpecialInstructions("");
    }
  }, [dish, initialQuantity]);

  // Calculate prices
  const selectedAddOnsList = useMemo(() => {
    return Array.from(selectedAddOnMap.values());
  }, [selectedAddOnMap]);

  const pricing = useMemo(() => {
    const base = dish?.priceLkr ?? 0;
    return calculateCustomizedDishPrice(base, selectedPortion, selectedAddOnsList, quantity);
  }, [dish, selectedPortion, selectedAddOnsList, quantity]);

  if (!isOpen || !dish) {
    return null;
  }

  const localizedDishName = resolveDishText(dish.name, language);

  const handleToggleAddOn = (opt: ModifierOption) => {
    setSelectedAddOnMap((prev) => {
      const next = new Map(prev);
      if (next.has(opt.id)) {
        next.delete(opt.id);
      } else {
        next.set(opt.id, opt);
      }
      return next;
    });
  };

  const handleToggleDietaryChip = (chipId: string) => {
    setSelectedDietaryChips((prev) => {
      const next = new Set(prev);
      if (next.has(chipId)) {
        next.delete(chipId);
      } else {
        next.add(chipId);
      }
      return next;
    });
  };

  const handleConfirmOrder = () => {
    const customized: GuestCustomizedDish = {
      dishId: dish.id,
      dishName: localizedDishName,
      basePriceLkr: dish.priceLkr,
      selectedPortion,
      selectedSpiceLevel: selectedSpice,
      selectedAddOns: selectedAddOnsList,
      dietaryPreferences: Array.from(selectedDietaryChips),
      specialInstructions: specialInstructions.trim() || undefined,
      quantity,
      unitPriceLkr: pricing.unitPriceLkr,
      totalPriceLkr: pricing.totalPriceLkr,
    };
    onConfirm(customized);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
      data-testid="dish-modifier-sheet"
      className={`fixed inset-0 m-0 w-full h-full max-w-none max-h-none bg-black/60 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 border-0 ${className}`}
    >
      {/* Click outside backdrop container */}
      <div className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-black/5 ">
        {/* Drag Handle Bar (Apple HIG mobile sheet) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 " />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-base font-bold text-slate-900 ">
              {localizedDishName}
            </h2>
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              Base: {formatLkr(dish.priceLkr)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close customisation sheet"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer"
          >
            x
          </button>
        </div>

        {/* Scrollable Modifier Options Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Portion Size */}
          <ModifierRadioGroup
            config={DEFAULT_PORTIONS}
            selectedOptionId={selectedPortion.id}
            language={language}
            onSelect={setSelectedPortion}
          />

          {/* Spice Level */}
          <ModifierRadioGroup
            config={DEFAULT_SPICE_LEVELS}
            selectedOptionId={selectedSpice.id}
            language={language}
            onSelect={setSelectedSpice}
          />

          {/* Add-ons */}
          <ModifierAddOnsList
            config={DEFAULT_ADDONS}
            selectedAddOnIds={new Set(selectedAddOnMap.keys())}
            language={language}
            onToggle={handleToggleAddOn}
          />

          {/* Dietary chips */}
          <DietaryPreferenceChips
            selectedChips={selectedDietaryChips}
            language={language}
            onToggle={handleToggleDietaryChip}
          />

          {/* Special Requests Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="special-instructions-input"
              className="text-xs font-bold text-slate-800 uppercase tracking-wider block"
            >
              Special Instructions for Chef
            </label>
            <textarea
              id="special-instructions-input"
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Please pack curry and sambol in separate containers..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-black/5 bg-slate-50/90 backdrop-blur-md flex items-center gap-3">
          {/* Stepper */}
          <div className="min-h-[44px] px-1 rounded-full bg-slate-200 flex items-center justify-between min-w-[96px]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-700 disabled:opacity-30 cursor-pointer"
            >
              −
            </button>
            <span className="text-xs font-bold tabular-nums px-2 text-slate-900 ">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-700 cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmOrder}
            className="flex-1 min-h-[44px] py-3 px-4 rounded-2xl bg-[#E8772E] hover:bg-[#d4651e] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/30 flex items-center justify-between transition-all duration-200 ease-apple-spring select-none cursor-pointer"
          >
            <span>Add to Cart</span>
            <span className="tabular-nums font-extrabold">{formatLkr(pricing.totalPriceLkr)}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
