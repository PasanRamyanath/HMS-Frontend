/**
 * Clean Master Menus & Services Catalog Page (`src/admin/menus/MenusAndCatalogPage.tsx`).
 * Matches `18_Menus_Outlets_86Board_Minibar_And_Meal_Plans.png` in Version 2.zip:
 * - Clean light-surface page header with "Bulk Reprice" and "+ Add Dish / Drink" actions
 * - 9-tab navigation bar ("Dishes & Drinks", "Categories", "86'd Board", "Minibar", "Laundry", "Happy Hour", "Meal Plans", "Menu Matrix", "Print View")
 * - Clean action pill row ("Seed Ceylon Catalog", "Bulk Reprice", "Export JSON", "Export CSV", "Print Menu")
 * - Zero emojis, zero artificial gradients, generous whitespace
 */

import { useEffect, useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { useTranslation } from "../../lib/i18n.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
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
    description:
      "Manage dishes & drinks, 86'd board, minibar, laundry tariffs, happy hour rules, and meal plans",
    badge: "Full Catalog",
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
  { id: "ITEMS", label: "Dishes & Drinks", badge: 48 },
  { id: "CATEGORIES", label: "Categories", badge: 7 },
  { id: "OUT_OF_STOCK", label: "86'd Board", badge: 2 },
  { id: "MINIBAR", label: "Minibar" },
  { id: "LAUNDRY", label: "Laundry" },
  { id: "HAPPY_HOUR", label: "Happy Hour" },
  { id: "MEAL_PLANS", label: "Meal Plans", badge: "RO/BB/HB/FB" },
  { id: "MENU_ENGINEERING", label: "Menu Matrix" },
  { id: "PRINT_SHEET", label: "Print View" },
];

// ============================================================================
// Pure KPI Computation Functions
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
    minibarItemsCount: 16,
    laundryItemsCount: 22,
    activeHappyHourRules: 3,
  };
}

// ============================================================================
// Subcomponents (Matching Screen 18 of Version 2.zip)
// ============================================================================

export interface MenuCatalogHeaderProps {
  readonly propertyTitle: string;
  readonly activeTabInfo: MenuCatalogTabMeta;
  readonly onOpenBulkPrice: () => void;
  readonly onExportMenu: (format: "json" | "csv") => void;
  readonly onPrintMenu: () => void;
  readonly onSeedComplete: (summary: SeedCatalogSummary) => void;
  readonly onAddNewDish?: (() => void) | undefined;
}

export function MenuCatalogHeader({
  propertyTitle,
  activeTabInfo,
  onOpenBulkPrice,
  onExportMenu,
  onPrintMenu,
  onSeedComplete,
  onAddNewDish,
}: MenuCatalogHeaderProps) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={`Menus & Outlets — ${activeTabInfo.label}`}
        subtitle={activeTabInfo.description}
        propertyTitle={propertyTitle}
        statusBadge={
          activeTabInfo.badge ? { label: activeTabInfo.badge, variant: "success" } : undefined
        }
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenBulkPrice}
              className="px-4 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
            >
              Bulk Reprice
            </button>

            <button
              type="button"
              onClick={() => onAddNewDish?.()}
              className="px-4 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold text-white bg-[#0B6E4F] hover:bg-[#09583F] transition-colors cursor-pointer"
            >
              + Add Dish / Drink
            </button>
          </div>
        }
      />

      {/* Action Pill Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SeedCatalogButton onSeedComplete={onSeedComplete} />

        <button
          type="button"
          onClick={onOpenBulkPrice}
          className="px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
        >
          Bulk Reprice
        </button>

        <button
          type="button"
          onClick={() => onExportMenu("json")}
          className="px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
        >
          Export JSON
        </button>

        <button
          type="button"
          onClick={() => onExportMenu("csv")}
          className="px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
        >
          Export CSV
        </button>

        <button
          type="button"
          onClick={onPrintMenu}
          className="px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
        >
          Print Menu
        </button>
      </div>
    </div>
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
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
    >
      <AdminKpiCard
        title="Total Dishes"
        value={kpis.totalDishes}
        subtitle="Live on QR & POS"
        size="sm"
        badge={{ text: "Catalog", variant: activeTab === "ITEMS" ? "success" : "neutral" }}
        onClick={() => onSelectTab("ITEMS")}
        className={activeTab === "ITEMS" ? "ring-2 ring-[#0B6E4F]" : ""}
      />

      <AdminKpiCard
        title="Categories"
        value={kpis.totalCategories}
        subtitle="DOMSpeed Taxonomy"
        size="sm"
        badge={{ text: "Taxonomy", variant: activeTab === "CATEGORIES" ? "success" : "neutral" }}
        onClick={() => onSelectTab("CATEGORIES")}
        className={activeTab === "CATEGORIES" ? "ring-2 ring-[#0B6E4F]" : ""}
      />

      <AdminKpiCard
        title="86'd Items"
        value={kpis.outOfStockCount}
        subtitle="Kitchen & Bar SLA"
        size="sm"
        badge={{ text: "86'd", variant: activeTab === "OUT_OF_STOCK" ? "danger" : "warning" }}
        onClick={() => onSelectTab("OUT_OF_STOCK")}
        className={activeTab === "OUT_OF_STOCK" ? "ring-2 ring-rose-500" : ""}
      />

      <AdminKpiCard
        title="Minibar Lines"
        value={kpis.minibarItemsCount}
        subtitle="Villa Par Stock"
        size="sm"
        badge={{ text: "Par Stock", variant: activeTab === "MINIBAR" ? "success" : "neutral" }}
        onClick={() => onSelectTab("MINIBAR")}
        className={activeTab === "MINIBAR" ? "ring-2 ring-[#0B6E4F]" : ""}
      />

      <AdminKpiCard
        title="Laundry Tariff"
        value={kpis.laundryItemsCount}
        subtitle="+50% 4h Express"
        size="sm"
        badge={{ text: "Tariffs", variant: activeTab === "LAUNDRY" ? "success" : "neutral" }}
        onClick={() => onSelectTab("LAUNDRY")}
        className={activeTab === "LAUNDRY" ? "ring-2 ring-[#0B6E4F]" : ""}
      />

      <AdminKpiCard
        title="Happy Hours"
        value={kpis.activeHappyHourRules}
        subtitle="Sunset Dynamic"
        size="sm"
        badge={{ text: "Dynamic", variant: activeTab === "HAPPY_HOUR" ? "success" : "neutral" }}
        onClick={() => onSelectTab("HAPPY_HOUR")}
        className={activeTab === "HAPPY_HOUR" ? "ring-2 ring-[#0B6E4F]" : ""}
      />
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

  const [activeTab, setActiveTab] = useState<MenuCatalogTabId>(initialTab);

  const [menuItems, setMenuItems] = useState<ReadonlyArray<AdminMenuItem>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hms_menu_items");
        if (stored) return JSON.parse(stored);
      } catch {
        // storage fallback
      }
    }
    return DEFAULT_DOMSPEED_MENU_ITEMS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hms_menu_items", JSON.stringify(menuItems));
        window.dispatchEvent(new Event("hms_menu_items_updated"));
      } catch {
        // storage fallback
      }
    }
  }, [menuItems]);

  const [outOfStockItems, setOutOfStockItems] = useState<ReadonlyArray<OutOfStockItem>>(
    DEFAULT_OUT_OF_STOCK_ITEMS,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const handleSeedComplete = (summary: SeedCatalogSummary) => {
    notify(
      "Catalog Seeded",
      `Created ${summary.itemsCreated} dishes and ${summary.categoriesCreated} categories`,
      "success",
    );
  };

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

  const handlePrintMenu = () => {
    setActiveTab("PRINT_SHEET");
    notify(
      "Physical Print Sheet",
      "Switched to A4 physical menu view with statutory tax note",
      "info",
    );
  };

  const handleRestoreItem = (itemId: string) => {
    setOutOfStockItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: true } : i)),
    );
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable: true } : i)));
    notify("Restored to Stock", `Item ${itemId} is now available on QR & POS`, "success");
  };

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

  const handleToggleGridItem = (itemId: string, isAvailable: boolean) => {
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable } : i)));
    if (!isAvailable) {
      handle86Item(itemId, "Quick 86 from Grid", null);
    } else {
      handleRestoreItem(itemId);
    }
  };

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
      className={`space-y-5 font-sf-pro ${className}`}
    >
      {/* Page Header */}
      <MenuCatalogHeader
        propertyTitle={propertyTitle}
        activeTabInfo={activeTabMeta}
        onOpenBulkPrice={() => setIsBulkPriceOpen(true)}
        onExportMenu={handleExportMenu}
        onPrintMenu={handlePrintMenu}
        onSeedComplete={handleSeedComplete}
        onAddNewDish={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
      />

      {/* Segmented Control Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 overflow-x-auto">
        <SegmentedControl
          options={MENU_SEGMENTED_OPTIONS}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
          className="min-w-fit"
        />
      </div>

      {/* KPI Metrics Banner */}
      <MenuCatalogKPIBanner kpis={kpis} activeTab={activeTab} onSelectTab={handleTabSelect} />

      {/* Workspace Tab Content */}
      <main>
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
