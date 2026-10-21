/**
 * Printable Physical Restaurant Menu & Wine List PDF/Print View (PrintableMenuSheet.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, and fine-dining outlets.
 * Auto-generates an elegant @media print A4 two-column physical restaurant menu
 * directly from the live QR catalog with statutory tax footer notes.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useMemo, useState } from "react";
import type { TrilingualText } from "../../generated/graphql.js";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { DEFAULT_DOMSPEED_CATEGORIES } from "./CategoryManager.js";
import { DEFAULT_DOMSPEED_MENU_ITEMS } from "./MenuItemGrid.js";

// ============================================================================
// Constants & Statutory Declarations
// ============================================================================

export const STATUTORY_TAX_FOOTER_NOTE =
  "All prices are in LKR and subject to 10% Service Charge and applicable government taxes (TDL, SSCL & VAT)";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PrintMenuLayout = "TWO_COLUMN" | "SINGLE_COLUMN";

export type PrintMenuTemplate =
  | "CEYLON_HERITAGE"
  | "MODERN_MINIMAL"
  | "TROPICAL_BISTRO"
  | "RUSTIC_VILLAGE"
  | "TWO_COLUMN_COMPACT";

interface MenuTemplateOption {
  readonly id: PrintMenuTemplate;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly recommendedLayout: PrintMenuLayout;
}

export const MENU_TEMPLATE_OPTIONS: ReadonlyArray<MenuTemplateOption> = [
  {
    id: "CEYLON_HERITAGE",
    name: "Ceylon Heritage",
    icon: "🏛️",
    description:
      "Classic Galle Face / Colonial Grand Hotel elegance, gold serif headers & ornamental crests",
    recommendedLayout: "TWO_COLUMN",
  },
  {
    id: "MODERN_MINIMAL",
    name: "Modern Minimalist",
    icon: "📐",
    description:
      "Aman / Boutique Beach Villa clean architectural grid with Plus Jakarta Sans & hairline dividers",
    recommendedLayout: "SINGLE_COLUMN",
  },
  {
    id: "TROPICAL_BISTRO",
    name: "Tropical Bistro",
    icon: "🌴",
    description:
      "Coastal resort & grill with fresh emerald/coral accents and modern category cards",
    recommendedLayout: "TWO_COLUMN",
  },
  {
    id: "RUSTIC_VILLAGE",
    name: "Rustic Heritage",
    icon: "🏺",
    description:
      "Sigiriya / Habarana cultural heritage with clay-pot styling & trilingual emphasis",
    recommendedLayout: "SINGLE_COLUMN",
  },
  {
    id: "TWO_COLUMN_COMPACT",
    name: "Dense Compendium",
    icon: "📋",
    description:
      "Balanced two-column layout engineered for extensive 24-hr room service & wine lists",
    recommendedLayout: "TWO_COLUMN",
  },
];

export interface PrintableMenuItem {
  readonly id: string;
  readonly code: string;
  readonly title: TrilingualText;
  readonly description?: Partial<TrilingualText> | TrilingualText | undefined;
  readonly priceLkr: number;
  readonly categoryId: string;
  readonly isVegetarian?: boolean | undefined;
  readonly isVegan?: boolean | undefined;
  readonly isHalal?: boolean | undefined;
  readonly isGlutenFree?: boolean | undefined;
  readonly spicyLevel?: number | undefined; // 0 = Mild, 1 = Med, 2 = Hot, 3 = Sri Lankan Hot
  readonly isAvailable?: boolean | undefined;
}

export interface PrintableMenuCategory {
  readonly id: string;
  readonly name: TrilingualText;
  readonly description?: TrilingualText | undefined;
  readonly displayOrder?: number | undefined;
}

export interface PrintableMenuConfig {
  readonly hotelName: string;
  readonly outletName: string;
  readonly mealSession: string;
  readonly sltdaRegNumber?: string | undefined;
  readonly layout: PrintMenuLayout;
  readonly template?: PrintMenuTemplate | undefined;
  readonly showSinhalaTamil: boolean;
  readonly showDescriptions: boolean;
  readonly showDietaryBadges: boolean;
  readonly showSpicyIcons: boolean;
}

export interface CategoryGroupedMenu {
  readonly category: PrintableMenuCategory;
  readonly items: ReadonlyArray<PrintableMenuItem>;
}

// ============================================================================
// Pure Domain Math & Formatting Helpers (Complexity <= 12)
// ============================================================================

export function formatPriceLkr(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function resolveTrilingualString(
  text: Partial<TrilingualText> | TrilingualText | undefined,
  language: SupportedLanguage = "en",
): string {
  if (!text) return "";
  return text[language] || text.en || "";
}

export function groupMenuItemsByCategory(
  items: ReadonlyArray<PrintableMenuItem>,
  categories: ReadonlyArray<PrintableMenuCategory>,
  availableOnly = true,
): ReadonlyArray<CategoryGroupedMenu> {
  const result: CategoryGroupedMenu[] = [];

  for (const cat of categories) {
    const catItems = items.filter((item) => {
      if (item.categoryId !== cat.id) return false;
      if (availableOnly && item.isAvailable === false) return false;
      return true;
    });

    if (catItems.length > 0) {
      result.push({
        category: cat,
        items: catItems,
      });
    }
  }

  return result;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface PrintableMenuHeaderProps {
  readonly hotelName: string;
  readonly outletName: string;
  readonly mealSession: string;
  readonly showSinhalaTamil?: boolean | undefined;
  readonly template?: PrintMenuTemplate | undefined;
}

export function PrintableMenuHeader({
  hotelName,
  outletName,
  mealSession,
  showSinhalaTamil = true,
  template = "CEYLON_HERITAGE",
}: PrintableMenuHeaderProps) {
  return (
    <header className="text-center pb-6 border-b border-apple-gray-300 dark:border-apple-gray-700 print:border-black/30">
      <div className="flex items-center justify-center gap-2 mb-1">
        {template === "CEYLON_HERITAGE" ? (
          <span className="text-xs uppercase tracking-[0.3em] font-serif font-bold text-amber-800 dark:text-amber-500 print:text-black">
            ❖ Ceylon Hospitality &amp; Fine Dining ❖
          </span>
        ) : template === "TROPICAL_BISTRO" ? (
          <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
            🌴 Coastal Dining &amp; Beachfront Grill 🌴
          </span>
        ) : template === "RUSTIC_VILLAGE" ? (
          <span className="text-xs uppercase tracking-widest font-bold text-amber-900 dark:text-amber-400 print:text-black">
            🏺 Authentic Sri Lankan Heritage &amp; Spices 🏺
          </span>
        ) : (
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-apple-gray-500 print:text-black/60">
            Ceylon Hospitality &amp; Fine Dining
          </span>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-apple-gray-900 dark:text-white print:text-black">
        {hotelName}
      </h1>

      <h2 className="text-base sm:text-lg font-medium text-apple-gray-700 dark:text-apple-300 print:text-black/80 mt-1">
        {outletName}
      </h2>

      {showSinhalaTamil && (
        <p className="text-xs text-apple-gray-500 print:text-black/60 mt-0.5">
          ආපනශාලා මෙනුව • உணவக மெனு
        </p>
      )}

      <div className="inline-block mt-3 px-4 py-1 rounded-full border border-apple-gray-300 dark:border-apple-gray-700 print:border-black/40">
        <span className="text-xs font-semibold tracking-wider uppercase text-apple-gray-800 dark:text-apple-200 print:text-black">
          {mealSession}
        </span>
      </div>
    </header>
  );
}

export interface PrintableMenuItemRowProps {
  readonly item: PrintableMenuItem;
  readonly showSinhalaTamil: boolean;
  readonly showDescriptions: boolean;
  readonly showDietaryBadges: boolean;
  readonly showSpicyIcons: boolean;
  readonly template?: PrintMenuTemplate | undefined;
}

export function PrintableMenuItemRow({
  item,
  showSinhalaTamil,
  showDescriptions,
  showDietaryBadges,
  showSpicyIcons,
}: PrintableMenuItemRowProps) {
  const spicySpikes = item.spicyLevel && item.spicyLevel > 0 ? "🌶️".repeat(item.spicyLevel) : null;

  return (
    <article className="py-2.5 break-inside-avoid" data-testid={`printable-item-${item.id}`}>
      {/* Title & Price Header Line */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white print:text-black leading-snug">
            {item.title.en}
          </h4>

          {showSpicyIcons && spicySpikes && (
            <span className="text-xs shrink-0" aria-label={`Spicy level ${item.spicyLevel}`}>
              {spicySpikes}
            </span>
          )}

          {showDietaryBadges && (
            <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
              {item.isVegetarian && (
                <span className="px-1.5 py-0.2 rounded border border-emerald-600 text-emerald-700 print:text-black print:border-black">
                  V
                </span>
              )}
              {item.isVegan && (
                <span className="px-1.5 py-0.2 rounded border border-green-600 text-green-700 print:text-black print:border-black">
                  VG
                </span>
              )}
              {item.isHalal && (
                <span className="px-1.5 py-0.2 rounded border border-amber-600 text-amber-700 print:text-black print:border-black">
                  H
                </span>
              )}
              {item.isGlutenFree && (
                <span className="px-1.5 py-0.2 rounded border border-blue-600 text-blue-700 print:text-black print:border-black">
                  GF
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dotted Leader Line for Traditional Print Menus */}
        <div className="flex-1 mx-2 border-b border-dotted border-apple-gray-300 dark:border-apple-gray-700 print:border-black/40 min-w-4" />

        <span className="text-sm font-bold font-mono text-apple-gray-900 dark:text-white print:text-black tabular-nums shrink-0">
          {formatPriceLkr(item.priceLkr)}
        </span>
      </div>

      {/* Trilingual Subtitle (Sinhala & Tamil) */}
      {showSinhalaTamil && (item.title.si || item.title.ta) && (
        <p className="text-[11px] text-apple-gray-600 dark:text-apple-400 print:text-black/70 italic mt-0.5">
          {[item.title.si, item.title.ta].filter(Boolean).join(" • ")}
        </p>
      )}

      {/* Description */}
      {showDescriptions && item.description?.en && (
        <p className="text-xs text-apple-gray-600 dark:text-apple-300 print:text-black/80 mt-1 leading-relaxed">
          {item.description.en}
        </p>
      )}
    </article>
  );
}

export interface PrintableCategorySectionProps {
  readonly group: CategoryGroupedMenu;
  readonly showSinhalaTamil: boolean;
  readonly showDescriptions: boolean;
  readonly showDietaryBadges: boolean;
  readonly showSpicyIcons: boolean;
  readonly template?: PrintMenuTemplate | undefined;
}

export function PrintableCategorySection({
  group,
  showSinhalaTamil,
  showDescriptions,
  showDietaryBadges,
  showSpicyIcons,
  template = "CEYLON_HERITAGE",
}: PrintableCategorySectionProps) {
  return (
    <section className="mb-6 break-inside-avoid">
      <div className="pb-1 mb-2 border-b border-apple-gray-200 dark:border-apple-gray-800 print:border-black/30">
        <div className="flex items-center gap-2">
          {template === "CEYLON_HERITAGE" && (
            <span className="text-amber-800 dark:text-amber-500 print:text-black text-xs font-serif">
              ❖
            </span>
          )}
          {template === "TROPICAL_BISTRO" && (
            <span className="text-emerald-600 dark:text-emerald-400 text-xs">🌴</span>
          )}
          {template === "RUSTIC_VILLAGE" && (
            <span className="text-amber-800 dark:text-amber-500 text-xs">🏺</span>
          )}
          <h3 className="text-base font-serif font-bold text-apple-gray-900 dark:text-white print:text-black uppercase tracking-wider">
            {group.category.name.en}
          </h3>
        </div>
        {showSinhalaTamil && (group.category.name.si || group.category.name.ta) && (
          <p className="text-[11px] text-apple-gray-500 print:text-black/60 italic">
            {[group.category.name.si, group.category.name.ta].filter(Boolean).join(" • ")}
          </p>
        )}
      </div>

      <div className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800/60 print:divide-black/10">
        {group.items.map((item) => (
          <PrintableMenuItemRow
            key={item.id}
            item={item}
            showSinhalaTamil={showSinhalaTamil}
            showDescriptions={showDescriptions}
            showDietaryBadges={showDietaryBadges}
            showSpicyIcons={showSpicyIcons}
            template={template}
          />
        ))}
      </div>
    </section>
  );
}

export interface PrintableMenuFooterProps {
  readonly sltdaRegNumber?: string | undefined;
}

export function PrintableMenuFooter({ sltdaRegNumber }: PrintableMenuFooterProps) {
  return (
    <footer className="mt-8 pt-4 border-t border-apple-gray-300 dark:border-apple-gray-700 print:border-black/40 text-center space-y-1.5 break-inside-avoid">
      <p className="text-xs font-semibold text-apple-gray-800 dark:text-apple-200 print:text-black">
        {STATUTORY_TAX_FOOTER_NOTE}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-apple-gray-500 print:text-black/60">
        <span>Dietary Key: V = Vegetarian, VG = Vegan, H = Halal, GF = Gluten Free</span>
        {sltdaRegNumber && <span>•</span>}
        {sltdaRegNumber && <span>SLTDA Reg: {sltdaRegNumber}</span>}
      </div>

      <p className="text-[10px] text-apple-gray-400 print:text-black/50 italic">
        Please inform your service captain of any specific food allergies or dietary preferences.
      </p>
    </footer>
  );
}

export interface PrintableMenuControlsProps {
  readonly config: PrintableMenuConfig;
  readonly onChangeConfig: (next: PrintableMenuConfig) => void;
  readonly onTriggerPrint?: (() => void) | undefined;
}

export function PrintableMenuControls({
  config,
  onChangeConfig,
  onTriggerPrint,
}: PrintableMenuControlsProps) {
  const layoutSelectId = useId();
  const sessionInputId = useId();

  const handlePrint = () => {
    if (onTriggerPrint) {
      onTriggerPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className="p-4 rounded-3xl apple-liquid-glass border border-white/40 dark:border-white/10 space-y-4 no-print"
      data-testid="printable-menu-controls"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <h3 className="text-base font-bold text-apple-gray-900 dark:text-white">
              Printable Physical Restaurant Menu &amp; Wine List
            </h3>
          </div>
          <p className="text-xs text-apple-gray-500 mt-0.5">
            Auto-generate A4 physical menus for dining tables, banquet events, and in-room guest
            compendiums.
          </p>
        </div>

        <button
          type="button"
          className="py-2.5 px-5 rounded-xl font-bold text-xs bg-apple-blue text-white shadow-md hover:bg-apple-blue/90 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-11 shrink-0"
          onClick={handlePrint}
        >
          <span>🖨️</span>
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Template Chooser Ribbon */}
      <div className="space-y-2 pt-2 border-t border-apple-gray-200 dark:border-apple-gray-800">
        <span className="text-xs font-bold text-apple-gray-700 dark:text-apple-300 uppercase tracking-wider block">
          Menu Styling Template:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MENU_TEMPLATE_OPTIONS.map((tmpl) => {
            const isSelected = (config.template ?? "CEYLON_HERITAGE") === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    template: tmpl.id,
                    layout: tmpl.recommendedLayout,
                  })
                }
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer min-h-[56px] ${
                  isSelected
                    ? "bg-apple-blue/10 dark:bg-apple-blue/20 border-apple-blue ring-2 ring-apple-blue/30 text-apple-blue dark:text-white"
                    : "bg-white/80 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 hover:border-apple-blue/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{tmpl.icon}</span>
                  <span className="text-xs font-bold truncate block">{tmpl.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                  {tmpl.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-apple-gray-200 dark:border-apple-gray-800">
        <div>
          <label
            htmlFor={layoutSelectId}
            className="text-xs font-semibold text-apple-gray-500 block mb-1"
          >
            Print Layout:
          </label>
          <select
            id={layoutSelectId}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white"
            value={config.layout}
            onChange={(e) =>
              onChangeConfig({ ...config, layout: e.target.value as PrintMenuLayout })
            }
          >
            <option value="TWO_COLUMN">A4 Two-Column (Dinner / Lunch)</option>
            <option value="SINGLE_COLUMN">Single Column (Wine / Tasting)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={sessionInputId}
            className="text-xs font-semibold text-apple-gray-500 block mb-1"
          >
            Meal Session Header:
          </label>
          <input
            id={sessionInputId}
            type="text"
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white"
            value={config.mealSession}
            onChange={(e) => onChangeConfig({ ...config, mealSession: e.target.value })}
          />
        </div>

        <div className="lg:col-span-2 flex flex-wrap items-center gap-4 pt-4 sm:pt-6">
          <label className="flex items-center gap-2 text-xs font-medium text-apple-gray-700 dark:text-apple-300 cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={config.showSinhalaTamil}
              onChange={(e) => onChangeConfig({ ...config, showSinhalaTamil: e.target.checked })}
              className="w-4 h-4 rounded text-apple-blue"
            />
            Sinhala &amp; Tamil Script
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-apple-gray-700 dark:text-apple-300 cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={config.showDescriptions}
              onChange={(e) => onChangeConfig({ ...config, showDescriptions: e.target.checked })}
              className="w-4 h-4 rounded text-apple-blue"
            />
            Item Descriptions
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-apple-gray-700 dark:text-apple-300 cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={config.showDietaryBadges}
              onChange={(e) => onChangeConfig({ ...config, showDietaryBadges: e.target.checked })}
              className="w-4 h-4 rounded text-apple-blue"
            />
            Dietary Badges (V/VG/H)
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: PrintableMenuSheet
// ============================================================================

export interface PrintableMenuSheetProps {
  readonly items?: ReadonlyArray<PrintableMenuItem> | undefined;
  readonly categories?: ReadonlyArray<PrintableMenuCategory> | undefined;
  readonly initialConfig?: Partial<PrintableMenuConfig> | undefined;
  readonly onTriggerPrint?: (() => void) | undefined;
  readonly className?: string | undefined;
}

export function PrintableMenuSheet({
  items = DEFAULT_DOMSPEED_MENU_ITEMS,
  categories = DEFAULT_DOMSPEED_CATEGORIES,
  initialConfig,
  onTriggerPrint,
  className = "",
}: PrintableMenuSheetProps) {
  const [config, setConfig] = useState<PrintableMenuConfig>({
    hotelName: initialConfig?.hotelName ?? "Amangalla Resort & Spa",
    outletName: initialConfig?.outletName ?? "The Verandah Restaurant & Wine Cellar",
    mealSession: initialConfig?.mealSession ?? "À La Carte Dinner Tasting Menu",
    sltdaRegNumber: initialConfig?.sltdaRegNumber ?? "SLTDA/SQA/HOT/00481",
    layout: initialConfig?.layout ?? "TWO_COLUMN",
    template: initialConfig?.template ?? "CEYLON_HERITAGE",
    showSinhalaTamil: initialConfig?.showSinhalaTamil ?? true,
    showDescriptions: initialConfig?.showDescriptions ?? true,
    showDietaryBadges: initialConfig?.showDietaryBadges ?? true,
    showSpicyIcons: initialConfig?.showSpicyIcons ?? true,
  });

  const selectedTemplate = config.template ?? "CEYLON_HERITAGE";

  const getTemplateContainerBorder = (tmpl: PrintMenuTemplate) => {
    switch (tmpl) {
      case "CEYLON_HERITAGE":
        return "border-double border-4 border-amber-900/30 print:border-black/60 font-serif";
      case "MODERN_MINIMAL":
        return "border border-slate-200 dark:border-white/10 print:border-none font-sans";
      case "TROPICAL_BISTRO":
        return "border-2 border-emerald-500/30 dark:border-emerald-500/20 print:border-black/40 font-sans";
      case "RUSTIC_VILLAGE":
        return "border-2 border-amber-800/40 dark:border-amber-700/30 print:border-black/50 font-serif";
      case "TWO_COLUMN_COMPACT":
        return "border border-slate-300 dark:border-slate-700 print:border-black/20 font-sans";
    }
  };

  const groupedCategories = useMemo(() => {
    return groupMenuItemsByCategory(items, categories, true);
  }, [items, categories]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="printable-menu-sheet-root">
      {/* On-screen controls bar (hidden on print via .no-print) */}
      <PrintableMenuControls
        config={config}
        onChangeConfig={setConfig}
        onTriggerPrint={onTriggerPrint}
      />

      {/* The Printable A4 Sheet Paper */}
      <div
        className={`bg-white dark:bg-apple-gray-900 print:bg-white text-apple-gray-900 dark:text-white print:text-black shadow-xl rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto ${getTemplateContainerBorder(
          selectedTemplate,
        )} print:shadow-none print:p-0`}
      >
        <PrintableMenuHeader
          hotelName={config.hotelName}
          outletName={config.outletName}
          mealSession={config.mealSession}
          showSinhalaTamil={config.showSinhalaTamil}
          template={selectedTemplate}
        />

        {/* Menu Body: Two-Column or Single-Column */}
        <div
          className={`mt-6 ${
            config.layout === "TWO_COLUMN"
              ? "columns-1 md:columns-2 gap-8 [column-fill:_balance]"
              : "space-y-6 max-w-2xl mx-auto"
          }`}
          data-testid="printable-menu-body"
        >
          {groupedCategories.map((group) => (
            <PrintableCategorySection
              key={group.category.id}
              group={group}
              showSinhalaTamil={config.showSinhalaTamil}
              showDescriptions={config.showDescriptions}
              showDietaryBadges={config.showDietaryBadges}
              showSpicyIcons={config.showSpicyIcons}
              template={selectedTemplate}
            />
          ))}
        </div>

        <PrintableMenuFooter sltdaRegNumber={config.sltdaRegNumber} />
      </div>
    </div>
  );
}
