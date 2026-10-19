/**
 * Master Menus & Services Catalog Page (MenusAndCatalogPage.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, boutique villas, and rest houses.
 * Unifies F&B Dishes, DOMSpeed Categories, Out-of-Stock (86'd Items) Board,
 * Minibar Catalog, Laundry Catalog, Happy Hour Dynamic Pricing, Meal-Plan Rules,
 * Recipe BOM, Menu Engineering Matrix, and Printable Physical Menus into an
 * Apple Human Interface Guidelines and Liquid Glass workspace.
 */

import { useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { useTranslation } from "../../lib/i18n.js";
import { type BulkPriceItem, BulkPriceModal } from "./BulkPriceModal.js";
import { CategoryManager, DEFAULT_DOMSPEED_CATEGORIES } from "./CategoryManager.js";
import { HappyHourRules } from "./HappyHourRules.js";
import { LaundryCatalogEditor } from "./LaundryCatalogEditor.js";
import { MealPlanMenuRules } from "./MealPlanMenuRules.js";
import { MenuEngineeringCard } from "./MenuEngineeringCard.js";
import { type AdminMenuItem, DEFAULT_DOMSPEED_MENU_ITEMS, MenuItemGrid } from "./MenuItemGrid.js";
import { MenuItemModal } from "./MenuItemModal.js";
import { MinibarCatalogEditor } from "./MinibarCatalogEditor.js";
import {
  DEFAULT_OUT_OF_STOCK_ITEMS,
  OutOfStockBoard,
  type OutOfStockItem,
} from "./OutOfStockBoard.js";
import { PrintableMenuSheet } from "./PrintableMenuSheet.js";
import { SeedCatalogButton, type SeedCatalogSummary } from "./SeedCatalogButton.js";
import {
  type ExportMenuItem,
  type MenuExportBundle,
  exportMenuItemsToCsv,
  exportMenuToJson,
} from "./menuImportExport.js";

function toExportMenuItem(item: AdminMenuItem): ExportMenuItem {
  return {
    id: item.id,
    code: item.code,
    categoryId: item.categoryId,
    titleEn: item.title.en,
    titleSi: item.title.si ?? "",
    titleTa: item.title.ta ?? "",
    descriptionEn: item.description?.en ?? "",
    descriptionSi: item.description?.si ?? "",
    descriptionTa: item.description?.ta ?? "",
    priceLkr: item.priceLkr,
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isHalal: item.isHalal,
    isGlutenFree: item.isGlutenFree,
    spicyLevel: item.spicyLevel,
    isAvailable: item.isAvailable,
    displayOrder: item.displayOrder,
    prepTimeMins: item.prepTimeMins,
  };
}

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MenuCatalogTabId =
  | "ITEMS"
  | "CATEGORIES"
  | "OUT_OF_STOCK"
  | "MINIBAR"
  | "LAUNDRY"
  | "HAPPY_HOUR"
  | "MEAL_PLANS"
  | "MENU_ENGINEERING"
  | "PRINT_SHEET";

export interface MenuCatalogTabMeta {
  readonly id: MenuCatalogTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly badge?: string | undefined;
}

export interface MenuCatalogKPIs {
  readonly totalDishes: number;
  readonly totalCategories: number;
  readonly outOfStockCount: number;
  readonly minibarItemsCount: number;
  readonly laundryItemsCount: number;
  readonly activeHappyHourRules: number;
}

export interface MenusAndCatalogPageProps {
  readonly initialTab?: MenuCatalogTabId | undefined;
  readonly propertyTitle?: string | undefined;
  readonly tenantId?: string | undefined;
  readonly onTabChange?: ((tabId: MenuCatalogTabId) => void) | undefined;
  readonly onActionNotify?:
    | ((title: string, message: string, variant?: "success" | "info" | "warning") => void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Tab Navigation Specifications
// ============================================================================

export const MENU_CATALOG_TABS: ReadonlyArray<MenuCatalogTabMeta> = [
  {
    id: "ITEMS",
    label: "Dishes & Drinks",
    shortLabel: "Menu",
    description: "Browse, edit, and create food dishes, drinks, modifiers, and recipe BOMs.",
  },
  {
    id: "CATEGORIES",
    label: "Categories & Timing",
    shortLabel: "Categories",
    description: "Configure DOMSpeed category sort order, icons, and SLTDA operational hours.",
  },
  {
    id: "OUT_OF_STOCK",
    label: "Out-of-Stock ('86'd')",
    shortLabel: "86'd Board",
    description: "Real-time kitchen & bar 86'd board with 1-tap restore and auto-restore timers.",
    badge: "Live Kitchen",
  },
  {
    id: "MINIBAR",
    label: "Minibar Room Par-Stock",
    shortLabel: "Minibar",
    description: "In-room guest minibar checklist, par levels, and QR self-declaration prices.",
  },
  {
    id: "LAUNDRY",
    label: "Laundry & Dry Cleaning",
    shortLabel: "Laundry",
    description:
      "Guest laundry tariffs, wash & press matrix, and 4-hour express turnaround surcharges.",
  },
  {
    id: "HAPPY_HOUR",
    label: "Happy Hour & Discounts",
    shortLabel: "Happy Hour",
    description: "Poolside and sunset dynamic discounts, BOGO rules, and daily time-windows.",
  },
  {
    id: "MEAL_PLANS",
    label: "Meal-Plan Allowances",
    shortLabel: "Meal Plans",
    description: "Configure BB, HB, FB, and All-Inclusive dish inclusions and supplements.",
  },
  {
    id: "MENU_ENGINEERING",
    label: "Menu Matrix & Profitability",
    shortLabel: "Matrix",
    description: "Kasavana & Smith BCG matrix (Stars, Plowhorses, Puzzles, Dogs) and BOM costs.",
    badge: "Profitability",
  },
  {
    id: "PRINT_SHEET",
    label: "Physical Print View",
    shortLabel: "Print PDF",
    description:
      "Two-column A4 physical restaurant menu and wine list with IRD statutory tax notes.",
  },
];

export const MENU_SEGMENTED_OPTIONS: ReadonlyArray<SegmentedControlOption<MenuCatalogTabId>> = [
  { id: "ITEMS", label: "Dishes & Drinks" },
  { id: "CATEGORIES", label: "Categories" },
  { id: "OUT_OF_STOCK", label: "86'd Board" },
  { id: "MINIBAR", label: "Minibar" },
  { id: "LAUNDRY", label: "Laundry" },
  { id: "HAPPY_HOUR", label: "Happy Hour" },
  { id: "MEAL_PLANS", label: "Meal Plans" },
  { id: "MENU_ENGINEERING", label: "Menu Matrix" },
  { id: "PRINT_SHEET", label: "Print View" },
];

// ============================================================================
// Pure KPI Computation Functions (Cognitive Complexity <= 12)
// ============================================================================

export function computeMenuCatalogKPIs(
  items: ReadonlyArray<AdminMenuItem>,
  categoriesCount: number,
  outOfStockItems: ReadonlyArray<OutOfStockItem>,
): MenuCatalogKPIs {
  const totalDishes = items.length;
  const outOfStockCount = outOfStockItems.filter((i) => !i.isAvailable).length;

  return {
    totalDishes,
    totalCategories: categoriesCount,
    outOfStockCount,
    minibarItemsCount: 16, // Standard Ceylon resort minibar items
    laundryItemsCount: 22, // Standard Ceylon guest laundry lines
    activeHappyHourRules: 3, // Sunset Arrack, Lion Beer & Cabana BOGO
  };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface MenuCatalogHeaderProps {
  readonly propertyTitle: string;
  readonly activeTabInfo: MenuCatalogTabMeta;
  readonly onOpenBulkPrice: () => void;
  readonly onExportMenu: (format: "json" | "csv") => void;
  readonly onPrintMenu: () => void;
  readonly onSeedComplete: (summary: SeedCatalogSummary) => void;
}

export function MenuCatalogHeader({
  propertyTitle,
  activeTabInfo,
  onOpenBulkPrice,
  onExportMenu,
  onPrintMenu,
  onSeedComplete,
}: MenuCatalogHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-apple-blue/20 text-apple-blue border border-apple-blue/30">
            {propertyTitle}
          </span>
          {activeTabInfo.badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {activeTabInfo.badge}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">{activeTabInfo.label}</h1>
        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">{activeTabInfo.description}</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SeedCatalogButton onSeedComplete={onSeedComplete} />

        <button
          type="button"
          onClick={onOpenBulkPrice}
          className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/10 transition-all"
        >
          ⚡ Bulk Reprice
        </button>

        <button
          type="button"
          onClick={() => onExportMenu("json")}
          className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-medium text-slate-300 bg-slate-900/60 hover:bg-slate-800 border border-white/10 transition-colors"
        >
          ⬇ Export JSON
        </button>

        <button
          type="button"
          onClick={() => onExportMenu("csv")}
          className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-medium text-slate-300 bg-slate-900/60 hover:bg-slate-800 border border-white/10 transition-colors"
        >
          ⬇ Export CSV
        </button>

        <button
          type="button"
          onClick={onPrintMenu}
          className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white bg-apple-blue hover:bg-blue-600 active:scale-95 shadow-md transition-all flex items-center gap-1.5"
        >
          <span>🖨️</span>
          <span>Print Menu</span>
        </button>
      </div>
    </header>
  );
}

export interface MenuCatalogKPIBannerProps {
  readonly kpis: MenuCatalogKPIs;
  readonly activeTab: MenuCatalogTabId;
  readonly onSelectTab: (tab: MenuCatalogTabId) => void;
}

export function MenuCatalogKPIBanner({ kpis, activeTab, onSelectTab }: MenuCatalogKPIBannerProps) {
  return (
    <div
      data-testid="menu-catalog-kpi-banner"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
    >
      <button
        type="button"
        onClick={() => onSelectTab("ITEMS")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "ITEMS"
            ? "bg-apple-blue/15 border-apple-blue/40 text-apple-blue shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          Total Dishes
        </span>
        <div className="text-2xl font-bold tabular-nums text-white mt-1">{kpis.totalDishes}</div>
        <span className="text-[11px] text-slate-400">Live on QR & POS</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("CATEGORIES")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "CATEGORIES"
            ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          Categories
        </span>
        <div className="text-2xl font-bold tabular-nums text-white mt-1">
          {kpis.totalCategories}
        </div>
        <span className="text-[11px] text-slate-400">DOMSpeed Taxonomy</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("OUT_OF_STOCK")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "OUT_OF_STOCK"
            ? "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          86'd Items
        </span>
        <div className="text-2xl font-bold tabular-nums text-rose-400 mt-1">
          {kpis.outOfStockCount}
        </div>
        <span className="text-[11px] text-rose-300">Kitchen & Bar SLA</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("MINIBAR")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "MINIBAR"
            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          Minibar Lines
        </span>
        <div className="text-2xl font-bold tabular-nums text-white mt-1">
          {kpis.minibarItemsCount}
        </div>
        <span className="text-[11px] text-slate-400">Villa Par Stock</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("LAUNDRY")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "LAUNDRY"
            ? "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          Laundry Tariff
        </span>
        <div className="text-2xl font-bold tabular-nums text-white mt-1">
          {kpis.laundryItemsCount}
        </div>
        <span className="text-[11px] text-slate-400">+50% 4h Express</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("HAPPY_HOUR")}
        className={`p-3.5 rounded-2xl border text-left transition-all ${
          activeTab === "HAPPY_HOUR"
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
            : "bg-slate-900/50 border-white/10 hover:border-white/20 text-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
          Happy Hours
        </span>
        <div className="text-2xl font-bold tabular-nums text-emerald-400 mt-1">
          {kpis.activeHappyHourRules}
        </div>
        <span className="text-[11px] text-emerald-300">Sunset Dynamic</span>
      </button>
    </div>
  );
}

// ============================================================================
// Master MenusAndCatalogPage Component
// ============================================================================

export function MenusAndCatalogPage({
  initialTab = "ITEMS",
  propertyTitle = "Galle Fort Lighthouse Villa",
  tenantId = "TENANT-GALLE-01",
  onTabChange,
  onActionNotify,
  className = "",
}: MenusAndCatalogPageProps) {
  const { currentLanguage } = useTranslation();
  const pageContainerId = useId();

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<MenuCatalogTabId>(initialTab);

  // Catalog State
  const [menuItems, setMenuItems] = useState<ReadonlyArray<AdminMenuItem>>(
    DEFAULT_DOMSPEED_MENU_ITEMS,
  );
  const [outOfStockItems, setOutOfStockItems] = useState<ReadonlyArray<OutOfStockItem>>(
    DEFAULT_OUT_OF_STOCK_ITEMS,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Modals state
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState<boolean>(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);

  const activeTabMeta: MenuCatalogTabMeta = useMemo(() => {
    return (
      MENU_CATALOG_TABS.find((t) => t.id === activeTab) ??
      (MENU_CATALOG_TABS[0] as MenuCatalogTabMeta)
    );
  }, [activeTab]);

  const kpis = useMemo(() => {
    return computeMenuCatalogKPIs(menuItems, DEFAULT_DOMSPEED_CATEGORIES.length, outOfStockItems);
  }, [menuItems, outOfStockItems]);

  const handleTabSelect = (newTab: MenuCatalogTabId) => {
    setActiveTab(newTab);
    onTabChange?.(newTab);
  };

  const notify = (
    title: string,
    message: string,
    variant: "success" | "info" | "warning" = "info",
  ) => {
    onActionNotify?.(title, message, variant);
  };

  // Bulk Price Application Handler
  const handleApplyBulkPrices = (
    updatedPrices: ReadonlyArray<{ id: string; newPriceLkr: number }>,
  ) => {
    const priceMap = new Map(updatedPrices.map((u) => [u.id, u.newPriceLkr]));
    setMenuItems((prev) =>
      prev.map((item) => {
        const newPrice = priceMap.get(item.id);
        return newPrice !== undefined ? { ...item, priceLkr: newPrice } : item;
      }),
    );
    notify(
      "Prices Updated",
      `Adjusted prices for ${updatedPrices.length} dishes in catalog`,
      "success",
    );
    setIsBulkPriceOpen(false);
  };

  // Seed Complete Handler
  const handleSeedComplete = (summary: SeedCatalogSummary) => {
    notify(
      "Catalog Seeded",
      `Created ${summary.itemsCreated} dishes and ${summary.categoriesCreated} categories`,
      "success",
    );
  };

  // Export Menu Handler
  const handleExportMenu = (format: "json" | "csv") => {
    const exportItems = menuItems.map(toExportMenuItem);
    if (format === "json") {
      const bundle: MenuExportBundle = {
        schemaVersion: "1.0.0",
        exportedAt: new Date().toISOString(),
        propertyMetadata: {
          tenantId,
          propertyName: propertyTitle,
        },
        categories: DEFAULT_DOMSPEED_CATEGORIES.map((c) => ({
          id: c.id,
          nameEn: c.name.en,
          nameSi: c.name.si ?? "",
          nameTa: c.name.ta ?? "",
          displayOrder: c.displayOrder,
          department: c.department,
          isActive: c.isActive ?? true,
        })),
        items: exportItems,
      };
      exportMenuToJson(bundle);
      notify("Exported JSON", `Catalog bundle generated: ${exportItems.length} dishes`, "success");
    } else {
      const csv = exportMenuItemsToCsv(exportItems);
      notify("Exported CSV", `Generated CSV with ${csv.split("\n").length - 1} rows`, "success");
    }
  };

  // Print Menu Handler
  const handlePrintMenu = () => {
    setActiveTab("PRINT_SHEET");
    notify(
      "Physical Print Sheet",
      "Switched to A4 physical menu view with statutory tax note",
      "info",
    );
  };

  // Out of stock restore handler
  const handleRestoreItem = (itemId: string) => {
    setOutOfStockItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: true } : i)),
    );
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable: true } : i)));
    notify("Restored to Stock", `Item ${itemId} is now available on QR & POS`, "success");
  };

  // Out of stock 86 handler
  const handle86Item = (itemId: string, reason: string, autoRestoreAt: string | null) => {
    setOutOfStockItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, isAvailable: false, reason, autoRestoreAt } : i,
        );
      }
      const dish = menuItems.find((i) => i.id === itemId);
      if (dish) {
        return [
          ...prev,
          {
            id: dish.id,
            code: dish.code,
            title: dish.title,
            categoryName: "Menu Item",
            department: dish.department,
            kitchenStation: dish.kitchenStation,
            priceLkr: dish.priceLkr,
            isAvailable: false,
            reason,
            autoRestoreAt,
            disabledAt: new Date().toISOString(),
          },
        ];
      }
      return prev;
    });
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable: false } : i)));
    notify("86'd Dish", `Item ${itemId} disabled on QR menu: ${reason}`, "warning");
  };

  // Menu item availability toggle from grid
  const handleToggleGridItem = (itemId: string, isAvailable: boolean) => {
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable } : i)));
    if (!isAvailable) {
      handle86Item(itemId, "Quick 86 from Grid", null);
    } else {
      handleRestoreItem(itemId);
    }
  };

  // Bulk price items adaptation
  const bulkPriceItems: ReadonlyArray<BulkPriceItem> = useMemo(() => {
    return menuItems.map((i) => ({
      id: i.id,
      code: i.code,
      title: i.title,
      categoryId: i.categoryId,
      currentPriceLkr: i.priceLkr,
      department: i.department,
      isAvailable: i.isAvailable,
    }));
  }, [menuItems]);

  return (
    <div
      id={pageContainerId}
      data-testid="menus-and-catalog-page"
      className={`min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 ${className}`}
    >
      {/* Page Header */}
      <MenuCatalogHeader
        propertyTitle={propertyTitle}
        activeTabInfo={activeTabMeta}
        onOpenBulkPrice={() => setIsBulkPriceOpen(true)}
        onExportMenu={handleExportMenu}
        onPrintMenu={handlePrintMenu}
        onSeedComplete={handleSeedComplete}
      />

      {/* KPI Metrics Banner */}
      <MenuCatalogKPIBanner kpis={kpis} activeTab={activeTab} onSelectTab={handleTabSelect} />

      {/* Segmented Control Navigation Bar */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
        <SegmentedControl
          options={MENU_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          className="min-w-fit"
        />
      </div>

      {/* Workspace Tab Content */}
      <main className="transition-opacity duration-200">
        {activeTab === "ITEMS" && (
          <MenuItemGrid
            items={menuItems}
            categories={DEFAULT_DOMSPEED_CATEGORIES}
            selectedCategoryId={selectedCategoryId ?? undefined}
            onSelectCategory={(catId) => setSelectedCategoryId(catId)}
            onToggleAvailability={handleToggleGridItem}
            onAddNewItem={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
          />
        )}

        {activeTab === "CATEGORIES" && <CategoryManager />}

        {activeTab === "OUT_OF_STOCK" && (
          <OutOfStockBoard
            items={outOfStockItems}
            allCatalogItems={outOfStockItems}
            onRestoreToStock={handleRestoreItem}
            onQuick86Item={handle86Item}
          />
        )}

        {activeTab === "MINIBAR" && <MinibarCatalogEditor />}

        {activeTab === "LAUNDRY" && <LaundryCatalogEditor />}

        {activeTab === "HAPPY_HOUR" && <HappyHourRules />}

        {activeTab === "MEAL_PLANS" && <MealPlanMenuRules />}

        {activeTab === "MENU_ENGINEERING" && <MenuEngineeringCard />}

        {activeTab === "PRINT_SHEET" && (
          <PrintableMenuSheet
            initialConfig={{ hotelName: propertyTitle }}
            items={menuItems}
            categories={DEFAULT_DOMSPEED_CATEGORIES}
          />
        )}
      </main>

      {/* Bulk Reprice Modal */}
      <BulkPriceModal
        isOpen={isBulkPriceOpen}
        items={bulkPriceItems}
        categories={DEFAULT_DOMSPEED_CATEGORIES}
        language={currentLanguage}
        onApply={handleApplyBulkPrices}
        onClose={() => setIsBulkPriceOpen(false)}
      />

      {/* Dish Item Creation / Edit Modal */}
      {isItemModalOpen && (
        <MenuItemModal
          isOpen={isItemModalOpen}
          initialItem={editingItem}
          categories={DEFAULT_DOMSPEED_CATEGORIES}
          onClose={() => setIsItemModalOpen(false)}
          onSave={(savedItem) => {
            setMenuItems((prev) => {
              const exists = prev.some((i) => i.id === savedItem.id);
              if (exists) {
                return prev.map((i) => (i.id === savedItem.id ? (savedItem as AdminMenuItem) : i));
              }
              return [...prev, savedItem as AdminMenuItem];
            });
            setIsItemModalOpen(false);
            notify("Dish Saved", `Successfully saved ${savedItem.code}`, "success");
          }}
        />
      )}
    </div>
  );
}
