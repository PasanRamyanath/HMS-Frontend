/**
 * Kitchen Spoilage, Breakage & Staff Meal Consumption Logger (`SpoilageAndStaffMealModal.tsx`)
 *
 * Implements Step 388 (Phase 16.13):
 * - Rung 2: Separates legitimate `Staff Duty Meals` and `Approved Spoilage/Breakage`
 *   from unexplained kitchen stock shrinkage.
 * - Logs daily food & beverage write-offs with statutory FIFO cost valuations:
 *     * STAFF_DUTY_MEAL: Brigade breakfast/lunch/dinner charged to Staff Welfare
 *     * KITCHEN_SPOILAGE: Cold-chain loss, trimming yield, expired shelf life
 *     * BREAKAGE_ACCIDENT: Broken bottles, dropped prep items
 *     * BUFFET_LEFTOVER: Unconsumed buffet trays logged for food-waste metrics
 * - Multi-tab Apple HIG workspace:
 *     * LOG_NEW_ENTRY: Interactive entry form with live cost calculation
 *     * DAILY_LOG_REGISTER: Tabular register of write-offs with category filters
 *     * PRINT_WASTE_VOUCHER: Printable A4 Kitchen Spoilage & Staff Meal Voucher
 * - Trilingual localizations (English, Sinhala, Tamil)
 * - Strict cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type FormEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import type { StockItemModel, StockUom } from "./StockItemManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type WriteOffType =
  | "STAFF_DUTY_MEAL"
  | "KITCHEN_SPOILAGE"
  | "BREAKAGE_ACCIDENT"
  | "BUFFET_LEFTOVER"
  | "VIP_TASTING_DEMO";

export type SpoilageReasonCode =
  | "EXPIRED_SHELF_LIFE"
  | "COLD_CHAIN_TEMPERATURE_FAILURE"
  | "TRIMMING_PREPARATION_YIELD"
  | "TRANSIT_BREAKAGE"
  | "STAFF_BREAKFAST"
  | "STAFF_LUNCH"
  | "STAFF_DINNER"
  | "NIGHT_SHIFT_SNACK"
  | "UNCONSUMED_BUFFET_PAN"
  | "MENU_R_AND_D";

export type CostCenterAccount =
  | "STAFF_WELFARE_FOOD"
  | "KITCHEN_SPOILAGE_EXPENSE"
  | "BEVERAGE_BREAKAGE_EXPENSE"
  | "BANQUET_OVERFLOW_COST"
  | "MARKETING_PROMOTION";

export type SpoilageModalActiveTab = "LOG_NEW_ENTRY" | "DAILY_LOG_REGISTER" | "PRINT_WASTE_VOUCHER";

export interface SpoilageEntryModel {
  readonly entryId: string;
  readonly date: string;
  readonly stockItemId: string;
  readonly sku: string;
  readonly itemName: string;
  readonly unitOfMeasure: StockUom;
  readonly writeOffType: WriteOffType;
  readonly reasonCode: SpoilageReasonCode;
  readonly costCenter: CostCenterAccount;
  readonly quantity: number;
  readonly unitCostLkr: number;
  readonly totalCostLkr: number;
  readonly recordedBy: string;
  readonly approvedBy: string;
  readonly notes: string;
}

export interface SpoilageSummaryTotals {
  readonly totalEntries: number;
  readonly totalQuantityKgOrUnits: number;
  readonly staffMealCostLkr: number;
  readonly spoilageCostLkr: number;
  readonly breakageCostLkr: number;
  readonly buffetLeftoverCostLkr: number;
  readonly totalWriteOffCostLkr: number;
}

// ============================================================================
// Default Sample Inventory & Write-off Entries
// ============================================================================

export const DEFAULT_WRITE_OFF_ITEMS: readonly SpoilageEntryModel[] = [
  {
    entryId: "WO-202610-001",
    date: "2026-10-20",
    stockItemId: "item-01",
    sku: "FB-MEA-001",
    itemName: "Ceylon Fresh Chicken Breast",
    unitOfMeasure: "kg",
    writeOffType: "STAFF_DUTY_MEAL",
    reasonCode: "STAFF_LUNCH",
    costCenter: "STAFF_WELFARE_FOOD",
    quantity: 8.5,
    unitCostLkr: 1450,
    totalCostLkr: 12325,
    recordedBy: "Chef Nalaka (Sous Chef)",
    approvedBy: "Chef Duminda (Executive Chef)",
    notes: "Duty lunch for 45 kitchen, stewarding and runner staff brigade",
  },
  {
    entryId: "WO-202610-002",
    date: "2026-10-20",
    stockItemId: "item-02",
    sku: "FB-SEA-002",
    itemName: "Negombo Lagoon Tiger Prawns",
    unitOfMeasure: "kg",
    writeOffType: "KITCHEN_SPOILAGE",
    reasonCode: "COLD_CHAIN_TEMPERATURE_FAILURE",
    costCenter: "KITCHEN_SPOILAGE_EXPENSE",
    quantity: 2.2,
    unitCostLkr: 3200,
    totalCostLkr: 7040,
    recordedBy: "Kamal Perera (Storekeeper)",
    approvedBy: "Chef Duminda (Executive Chef)",
    notes: "Walk-in freezer B defrost glitch during power changeover",
  },
  {
    entryId: "WO-202610-003",
    date: "2026-10-20",
    stockItemId: "item-03",
    sku: "FB-DAI-001",
    itemName: "Pelwatte Fresh Full Cream Milk",
    unitOfMeasure: "L",
    writeOffType: "KITCHEN_SPOILAGE",
    reasonCode: "EXPIRED_SHELF_LIFE",
    costCenter: "KITCHEN_SPOILAGE_EXPENSE",
    quantity: 4.0,
    unitCostLkr: 480,
    totalCostLkr: 1920,
    recordedBy: "Chef Nalaka (Sous Chef)",
    approvedBy: "Chef Duminda (Executive Chef)",
    notes: "Curdled during pasteurization inspection before breakfast service",
  },
  {
    entryId: "WO-202610-004",
    date: "2026-10-20",
    stockItemId: "item-04",
    sku: "BAR-ARR-001",
    itemName: "Rockland Old Arrack 750ml",
    unitOfMeasure: "btl",
    writeOffType: "BREAKAGE_ACCIDENT",
    reasonCode: "TRANSIT_BREAKAGE",
    costCenter: "BEVERAGE_BREAKAGE_EXPENSE",
    quantity: 1,
    unitCostLkr: 3400,
    totalCostLkr: 3400,
    recordedBy: "Sunil Fernando (Bar Steward)",
    approvedBy: "Rohan De Silva (F&B Controller)",
    notes: "Slipped on wet floor during main store GIN trolley transfer",
  },
];

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const SPOILAGE_TRANSLATIONS = {
  en: {
    title: "Kitchen Spoilage, Breakage & Staff Meal Logger",
    subtitle:
      "Separates legitimate staff duty meals and approved kitchen spoilage from unexplained food shrinkage.",
    tabs: {
      logNewEntry: "Log Consumption / Waste",
      dailyLogRegister: "Daily Waste Register",
      printWasteVoucher: "A4 Spoilage Voucher",
    },
    fields: {
      date: "Write-off Date",
      type: "Classification Type",
      stockItem: "Select Stock Item",
      quantity: "Quantity Written Off",
      unitCost: "Unit Cost (LKR)",
      totalCost: "Total Write-Off (LKR)",
      reason: "Reason Code",
      costCenter: "Cost Center Account",
      recordedBy: "Recorded By (Chef / Steward)",
      approvedBy: "Approved By (Executive Chef / F&B)",
      notes: "Incident Description / Corrective Action",
    },
    types: {
      STAFF_DUTY_MEAL: "Staff Duty Meal (Welfare)",
      KITCHEN_SPOILAGE: "Kitchen Spoilage (Trimming / Heat)",
      BREAKAGE_ACCIDENT: "Breakage / Transport Accident",
      BUFFET_LEFTOVER: "Buffet Excess / Production Waste",
      VIP_TASTING_DEMO: "VIP Tasting / Chef Demo",
    },
    reasons: {
      STAFF_BREAKFAST: "Staff Morning Duty Breakfast",
      STAFF_LUNCH: "Staff Midday Duty Lunch",
      STAFF_DINNER: "Staff Evening Duty Dinner",
      NIGHT_SHIFT_SNACK: "Night Shift Security / Front Desk Snack",
      EXPIRED_SHELF_LIFE: "Expired Product Shelf Life",
      COLD_CHAIN_TEMPERATURE_FAILURE: "Cold Chain Chiller / Power Failure",
      TRIMMING_PREPARATION_YIELD: "Heavy Bone / Fat Trimming Yield Loss",
      TRANSIT_BREAKAGE: "Dropped / Crushed in Transit",
      UNCONSUMED_BUFFET_PAN: "Unconsumed Buffet Heated Food",
      MENU_R_AND_D: "New Seasonal Menu Testing & Tasting",
    },
    costCenters: {
      STAFF_WELFARE_FOOD: "Staff Welfare Food Expense",
      KITCHEN_SPOILAGE_EXPENSE: "Kitchen Spoilage Operational Loss",
      BEVERAGE_BREAKAGE_EXPENSE: "Bar & Cellar Breakage Expense",
      BANQUET_OVERFLOW_COST: "Banquet Over-Production Buffer",
      MARKETING_PROMOTION: "Marketing & Public Relations Tasting",
    },
    kpi: {
      totalStaffMeal: "Staff Duty Meals",
      totalSpoilage: "Approved Spoilage",
      totalBreakage: "Bar Breakage",
      netWriteOff: "Total Written Off",
      totalItems: "Recorded Incidents",
    },
    buttons: {
      addEntry: "Record Consumption",
      saveVoucher: "Confirm & Post Write-Offs",
      printVoucher: "Print A4 Waste Voucher",
      filterAll: "All Write-Offs",
      deleteEntry: "Remove",
    },
  },
  si: {
    title: "මුළුතැන්ගෙයි හානි, කැඩීම් සහ කාර්ය මණ්ඩල ආහාර සටහන් පොත",
    subtitle: "නියමිත කාර්ය මණ්ඩල ආහාර සහ අනුමත ආහාර හානි පැහැදිලි නොකළ තොග අඩුවීම් වලින් වෙන්කර හඳුනාගැනීම.",
    tabs: {
      logNewEntry: "නව සටහනක් එක්කරන්න",
      dailyLogRegister: "දෛනික ලේඛනය",
      printWasteVoucher: "A4 සහතිකය",
    },
    fields: {
      date: "දිනය",
      type: "වර්ගීකරණය",
      stockItem: "භාණ්ඩය තෝරන්න",
      quantity: "අඩුකළ ප්‍රමාණය",
      unitCost: "ඒකක පිරිවැය (LKR)",
      totalCost: "මුළු පිරිවැය (LKR)",
      reason: "හේතුව",
      costCenter: "පිරිවැය ගිණුම",
      recordedBy: "සටහන් කළේ",
      approvedBy: "අනුමත කළේ",
      notes: "විස්තරය / ප්‍රතිකර්මය",
    },
    types: {
      STAFF_DUTY_MEAL: "කාර්ය මණ්ඩල ආහාර (සුභසාධන)",
      KITCHEN_SPOILAGE: "මුළුතැන්ගෙයි නාස්තිය / හානිය",
      BREAKAGE_ACCIDENT: "බිඳවැටීම් සහ අනතුරු",
      BUFFET_LEFTOVER: "බුෆේ ඉතිරි ආහාර",
      VIP_TASTING_DEMO: "විශේෂ රස පරීක්ෂණ",
    },
    reasons: {
      STAFF_BREAKFAST: "සේවක උදෑසන ආහාරය",
      STAFF_LUNCH: "සේවක දිවා ආහාරය",
      STAFF_DINNER: "සේවක රාත්‍රී ආහාරය",
      NIGHT_SHIFT_SNACK: "රාත්‍රී මුරයේ කෙටි ආහාර",
      EXPIRED_SHELF_LIFE: "කල් ඉකුත් වූ ද්‍රව්‍ය",
      COLD_CHAIN_TEMPERATURE_FAILURE: "ශීතකරණ දෝෂ සහ උෂ්ණත්ව ගැටළු",
      TRIMMING_PREPARATION_YIELD: "මස්/එළවළු කපා ඉවත් කළ කොටස්",
      TRANSIT_BREAKAGE: "ප්‍රවාහනයේදී බිඳී යාම්",
      UNCONSUMED_BUFFET_PAN: "ඉතිරි වූ බුෆේ ආහාර",
      MENU_R_AND_D: "නව කෑම වර්ග පරීක්ෂා කිරීම",
    },
    costCenters: {
      STAFF_WELFARE_FOOD: "කාර්ය මණ්ඩල සුභසාධන වියදම",
      KITCHEN_SPOILAGE_EXPENSE: "මුළුතැන්ගෙයි නාස්ති වියදම",
      BEVERAGE_BREAKAGE_EXPENSE: "බීම සහ බෝතල් බිඳීම් වියදම",
      BANQUET_OVERFLOW_COST: "උත්සව අතිරික්ත පිරිවැය",
      MARKETING_PROMOTION: "ප්‍රවර්ධන රස බැලීම්",
    },
    kpi: {
      totalStaffMeal: "කාර්ය මණ්ඩල ආහාර",
      totalSpoilage: "අනුමත හානි",
      totalBreakage: "බෝතල් කැඩීම්",
      netWriteOff: "මුළු ඉවත්කිරීම්",
      totalItems: "සටහන් ගණන",
    },
    buttons: {
      addEntry: "සටහන් කරන්න",
      saveVoucher: "තහවුරු කර සුරකින්න",
      printVoucher: "සහතිකය මුද්‍රණය",
      filterAll: "සියල්ල",
      deleteEntry: "මකන්න",
    },
  },
  ta: {
    title: "சமையலறை சேதம், உடைப்பு மற்றும் ஊழியர் உணவு பதிவு தாள்",
    subtitle:
      "ஊழியர் உணவுகள் மற்றும் அனுமதிக்கப்பட்ட சமையலறை சேதங்களை விவரிக்க முடியாத குறைபாடுகளிலிருந்து பிரித்தல்.",
    tabs: {
      logNewEntry: "புதிய பதிவு",
      dailyLogRegister: "தினசரி பதிவு தாள்",
      printWasteVoucher: "A4 சான்றிதழ்",
    },
    fields: {
      date: "தேதி",
      type: "வகைப்பாடு",
      stockItem: "பொருள் தெரிவு",
      quantity: "அளவு",
      unitCost: "அலகு விலை (LKR)",
      totalCost: "மொத்த இழப்பு (LKR)",
      reason: "காரணம்",
      costCenter: "கணக்கு மையம்",
      recordedBy: "பதிவு செய்தவர்",
      approvedBy: "அனுமதித்தவர்",
      notes: "விளக்கம் / நடவடிக்கை",
    },
    types: {
      STAFF_DUTY_MEAL: "ஊழியர் உணவு (நலன்புரி)",
      KITCHEN_SPOILAGE: "சமையலறை வீணடிப்பு",
      BREAKAGE_ACCIDENT: "உடைப்பு / விபத்து",
      BUFFET_LEFTOVER: "பஃபே மீதி உணவு",
      VIP_TASTING_DEMO: "சுவை பரிசோதனை",
    },
    reasons: {
      STAFF_BREAKFAST: "ஊழியர் காலை உணவு",
      STAFF_LUNCH: "ஊழியர் மதிய உணவு",
      STAFF_DINNER: "ஊழியர் இரவு உணவு",
      NIGHT_SHIFT_SNACK: "இரவு நேர சிற்றுண்டி",
      EXPIRED_SHELF_LIFE: "காலாவதியான பொருள்",
      COLD_CHAIN_TEMPERATURE_FAILURE: "குளிர்சாதன பழுது / வெப்ப இழப்பு",
      TRIMMING_PREPARATION_YIELD: "வெட்டு இழப்பு",
      TRANSIT_BREAKAGE: "போக்குவரத்து உடைப்பு",
      UNCONSUMED_BUFFET_PAN: "மீதமான பஃபே உணவு",
      MENU_R_AND_D: "புதிய மெனு பரிசோதனை",
    },
    costCenters: {
      STAFF_WELFARE_FOOD: "ஊழியர் நலன்புரி செலவு",
      KITCHEN_SPOILAGE_EXPENSE: "சமையலறை சேத இழப்பு",
      BEVERAGE_BREAKAGE_EXPENSE: "மதுபான உடைப்பு செலவு",
      BANQUET_OVERFLOW_COST: "விருந்து உபரி செலவு",
      MARKETING_PROMOTION: "விளம்பர சுவை செலவு",
    },
    kpi: {
      totalStaffMeal: "ஊழியர் உணவுகள்",
      totalSpoilage: "அனுமதிக்கப்பட்ட சேதம்",
      totalBreakage: "பாட்டில் உடைப்பு",
      netWriteOff: "மொத்த இழப்பு",
      totalItems: "பதிவுகள்",
    },
    buttons: {
      addEntry: "பதிவு செய்க",
      saveVoucher: "உறுதிப்படுத்துக",
      printVoucher: "அச்சிடுக",
      filterAll: "அனைத்தும்",
      deleteEntry: "நீக்குக",
    },
  },
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Computes exact financial total for a write-off line: quantity * unitCostLkr.
 */
export function calculateLineWriteOffTotalLkr(quantity: number, unitCostLkr: number): number {
  const q = Math.max(0, Number(quantity) || 0);
  const cost = Math.max(0, Number(unitCostLkr) || 0);
  return Math.round((q * cost + Number.EPSILON) * 100) / 100;
}

/**
 * Aggregates all daily write-off records into distinct operational expense buckets.
 */
export function calculateSpoilageSummary(
  entries: readonly SpoilageEntryModel[],
): SpoilageSummaryTotals {
  let totalQuantity = 0;
  let staffMealCost = 0;
  let spoilageCost = 0;
  let breakageCost = 0;
  let buffetLeftoverCost = 0;
  let totalCost = 0;

  for (const entry of entries) {
    totalQuantity += entry.quantity;
    totalCost += entry.totalCostLkr;

    switch (entry.writeOffType) {
      case "STAFF_DUTY_MEAL":
        staffMealCost += entry.totalCostLkr;
        break;
      case "KITCHEN_SPOILAGE":
        spoilageCost += entry.totalCostLkr;
        break;
      case "BREAKAGE_ACCIDENT":
        breakageCost += entry.totalCostLkr;
        break;
      case "BUFFET_LEFTOVER":
      case "VIP_TASTING_DEMO":
        buffetLeftoverCost += entry.totalCostLkr;
        break;
    }
  }

  return {
    totalEntries: entries.length,
    totalQuantityKgOrUnits: Math.round((totalQuantity + Number.EPSILON) * 100) / 100,
    staffMealCostLkr: Math.round((staffMealCost + Number.EPSILON) * 100) / 100,
    spoilageCostLkr: Math.round((spoilageCost + Number.EPSILON) * 100) / 100,
    breakageCostLkr: Math.round((breakageCost + Number.EPSILON) * 100) / 100,
    buffetLeftoverCostLkr: Math.round((buffetLeftoverCost + Number.EPSILON) * 100) / 100,
    totalWriteOffCostLkr: Math.round((totalCost + Number.EPSILON) * 100) / 100,
  };
}

/**
 * Maps write-off types to semantic Apple HIG badge colors.
 */
export function getWriteOffTypeBadgeColor(
  type: WriteOffType,
): "green" | "amber" | "red" | "blue" | "gray" {
  switch (type) {
    case "STAFF_DUTY_MEAL":
      return "green";
    case "KITCHEN_SPOILAGE":
      return "red";
    case "BREAKAGE_ACCIDENT":
      return "amber";
    case "BUFFET_LEFTOVER":
      return "blue";
    case "VIP_TASTING_DEMO":
      return "gray";
  }
}

// ============================================================================
// Props & Modal Component
// ============================================================================

export interface SpoilageAndStaffMealModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialEntries?: readonly SpoilageEntryModel[] | undefined;
  readonly stockCatalog?: readonly StockItemModel[] | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
  readonly onSaveEntries?:
    | ((entries: readonly SpoilageEntryModel[]) => void | Promise<void>)
    | undefined;
}

export function SpoilageAndStaffMealModal({
  isOpen,
  onClose,
  initialEntries = DEFAULT_WRITE_OFF_ITEMS,
  language = "en",
  onSaveEntries,
}: SpoilageAndStaffMealModalProps) {
  const t = SPOILAGE_TRANSLATIONS[language] ?? SPOILAGE_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<SpoilageModalActiveTab>("DAILY_LOG_REGISTER");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<WriteOffType | "ALL">("ALL");
  const [entries, setEntries] = useState<readonly SpoilageEntryModel[]>(initialEntries);

  const summary = useMemo(() => calculateSpoilageSummary(entries), [entries]);

  const filteredEntries = useMemo(() => {
    if (selectedTypeFilter === "ALL") return entries;
    return entries.filter((e) => e.writeOffType === selectedTypeFilter);
  }, [entries, selectedTypeFilter]);

  const handleAddEntry = (newEntry: SpoilageEntryModel) => {
    setEntries((prev) => [newEntry, ...prev]);
    setActiveTab("DAILY_LOG_REGISTER");
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
  };

  const handleConfirmAndSave = () => {
    if (onSaveEntries) {
      onSaveEntries(entries);
    }
    onClose();
  };

  if (!isOpen) return null;

  const tabOptions: SegmentedControlOption<SpoilageModalActiveTab>[] = [
    { id: "DAILY_LOG_REGISTER", label: t.tabs.dailyLogRegister },
    { id: "LOG_NEW_ENTRY", label: t.tabs.logNewEntry },
    { id: "PRINT_WASTE_VOUCHER", label: t.tabs.printWasteVoucher },
  ];

  return (
    <DialogModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6" data-testid="spoilage-staff-meal-modal">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="waste-log">
                📋
              </span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.title}</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              data-testid="confirm-write-offs-button"
            >
              {t.buttons.saveVoucher}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiMetricCard
            label={t.kpi.totalStaffMeal}
            value={formatLkr(summary.staffMealCostLkr)}
            subtext="Staff Welfare Account"
            accent="green"
          />
          <KpiMetricCard
            label={t.kpi.totalSpoilage}
            value={formatLkr(summary.spoilageCostLkr)}
            subtext="Kitchen Cold Chain / Yield"
            accent="red"
          />
          <KpiMetricCard
            label={t.kpi.totalBreakage}
            value={formatLkr(summary.breakageCostLkr)}
            subtext="Transit & Bar Accidental"
            accent="amber"
          />
          <KpiMetricCard
            label={t.kpi.netWriteOff}
            value={formatLkr(summary.totalWriteOffCostLkr)}
            subtext={`${summary.totalEntries} logged incidents`}
            accent="blue"
          />
        </div>

        {/* Tab Panels */}
        {activeTab === "DAILY_LOG_REGISTER" && (
          <DailyRegisterTab
            t={t}
            selectedFilter={selectedTypeFilter}
            onFilterChange={setSelectedTypeFilter}
            entries={filteredEntries}
            onDelete={handleDeleteEntry}
          />
        )}

        {activeTab === "LOG_NEW_ENTRY" && <LogNewEntryTab t={t} onAddEntry={handleAddEntry} />}

        {activeTab === "PRINT_WASTE_VOUCHER" && (
          <PrintWasteVoucherTab t={t} entries={entries} summary={summary} />
        )}
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Subcomponent: KPI Metric Card
// ============================================================================

interface KpiMetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly subtext: string;
  readonly accent: "green" | "red" | "amber" | "blue";
}

function KpiMetricCard({ label, value, subtext, accent }: KpiMetricCardProps) {
  const accentClass = {
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
  }[accent];

  return (
    <GlassCard material="regular" radius="lg" className="p-3.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate block">
        {label}
      </span>
      <div className="my-1">
        <span className={`text-base font-bold tabular-nums-lkr tracking-tight ${accentClass}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 truncate block">{subtext}</span>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: Daily Register Tab
// ============================================================================

interface DailyRegisterTabProps {
  readonly t: (typeof SPOILAGE_TRANSLATIONS)["en"];
  readonly selectedFilter: WriteOffType | "ALL";
  readonly onFilterChange: (type: WriteOffType | "ALL") => void;
  readonly entries: readonly SpoilageEntryModel[];
  readonly onDelete: (entryId: string) => void;
}

function DailyRegisterTab({
  t,
  selectedFilter,
  onFilterChange,
  entries,
  onDelete,
}: DailyRegisterTabProps) {
  const filterTypes: readonly (WriteOffType | "ALL")[] = [
    "ALL",
    "STAFF_DUTY_MEAL",
    "KITCHEN_SPOILAGE",
    "BREAKAGE_ACCIDENT",
    "BUFFET_LEFTOVER",
  ];

  return (
    <div className="space-y-4">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filterTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onFilterChange(type)}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === type
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            {type === "ALL" ? t.buttons.filterAll : t.types[type]}
          </button>
        ))}
      </div>

      {/* Entries Table */}
      <div className="overflow-x-auto border border-gray-200/80 dark:border-white/10 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
            <tr>
              <th className="py-2.5 px-3">Item / SKU</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-right">Quantity</th>
              <th className="py-2.5 px-3 text-right">Unit Cost</th>
              <th className="py-2.5 px-3 text-right">Total Cost</th>
              <th className="py-2.5 px-3">Reason & Authorization</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {entries.map((entry) => (
              <RegisterRowItem key={entry.entryId} t={t} entry={entry} onDelete={onDelete} />
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            No entries found for the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterRowItem({
  t,
  entry,
  onDelete,
}: {
  readonly t: (typeof SPOILAGE_TRANSLATIONS)["en"];
  readonly entry: SpoilageEntryModel;
  readonly onDelete: (id: string) => void;
}) {
  const badgeColor = getWriteOffTypeBadgeColor(entry.writeOffType);

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
      <td className="py-2.5 px-3">
        <span className="font-semibold text-gray-900 dark:text-white block">{entry.itemName}</span>
        <span className="text-[10px] text-gray-400 font-mono">
          {entry.sku} • {entry.date}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <StatusBadge
          status={entry.writeOffType}
          label={t.types[entry.writeOffType]}
          color={badgeColor}
          size="sm"
        />
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums-lkr font-medium">
        {entry.quantity} {entry.unitOfMeasure}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums-lkr text-gray-600 dark:text-gray-300">
        {formatLkr(entry.unitCostLkr)}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums-lkr font-bold text-gray-900 dark:text-white">
        {formatLkr(entry.totalCostLkr)}
      </td>
      <td className="py-2.5 px-3">
        <span className="font-medium text-gray-700 dark:text-gray-200 block">
          {t.reasons[entry.reasonCode] ?? entry.reasonCode}
        </span>
        <span className="text-[10px] text-gray-400 block truncate max-w-[200px]">
          By: {entry.recordedBy} (Auth: {entry.approvedBy})
        </span>
      </td>
      <td className="py-2.5 px-3 text-center">
        <button
          type="button"
          onClick={() => onDelete(entry.entryId)}
          className="text-rose-600 hover:text-rose-700 font-medium text-xs px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
          aria-label={`Delete ${entry.itemName}`}
        >
          {t.buttons.deleteEntry}
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Subcomponent: Log New Entry Tab (Interactive Form)
// ============================================================================

interface LogNewEntryTabProps {
  readonly t: (typeof SPOILAGE_TRANSLATIONS)["en"];
  readonly onAddEntry: (entry: SpoilageEntryModel) => void;
}

function LogNewEntryTab({ t, onAddEntry }: LogNewEntryTabProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [itemName, setItemName] = useState("Fresh Barramundi Modha Fillet");
  const [sku, setSku] = useState("FB-SEA-004");
  const [unitOfMeasure, setUnitOfMeasure] = useState<StockUom>("kg");
  const [writeOffType, setWriteOffType] = useState<WriteOffType>("STAFF_DUTY_MEAL");
  const [reasonCode, setReasonCode] = useState<SpoilageReasonCode>("STAFF_LUNCH");
  const [costCenter, setCostCenter] = useState<CostCenterAccount>("STAFF_WELFARE_FOOD");
  const [quantity, setQuantity] = useState(5.0);
  const [unitCostLkr, setUnitCostLkr] = useState(2400);
  const [recordedBy, setRecordedBy] = useState("Chef Nalaka (Sous Chef)");
  const [approvedBy, setApprovedBy] = useState("Chef Duminda (Executive Chef)");
  const [notes, setNotes] = useState("Staff midday duty lunch curry portion");

  const totalCostLkr = useMemo(
    () => calculateLineWriteOffTotalLkr(quantity, unitCostLkr),
    [quantity, unitCostLkr],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const entry: SpoilageEntryModel = {
      entryId: `WO-${Date.now().toString().slice(-6)}`,
      date,
      stockItemId: `item-${Date.now().toString().slice(-4)}`,
      sku,
      itemName,
      unitOfMeasure,
      writeOffType,
      reasonCode,
      costCenter,
      quantity,
      unitCostLkr,
      totalCostLkr,
      recordedBy,
      approvedBy,
      notes,
    };
    onAddEntry(entry);
  };

  const dateId = useId();
  const typeId = useId();
  const itemId = useId();
  const skuId = useId();
  const uomId = useId();
  const qtyId = useId();
  const costId = useId();
  const reasonId = useId();
  const costCenterId = useId();
  const recorderId = useId();
  const approverId = useId();
  const notesId = useId();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <GlassCard material="regular" radius="xl" className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={dateId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.date}
            </label>
            <input
              id={dateId}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor={typeId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.type}
            </label>
            <select
              id={typeId}
              value={writeOffType}
              onChange={(e) => setWriteOffType(e.target.value as WriteOffType)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
            >
              <option value="STAFF_DUTY_MEAL">{t.types.STAFF_DUTY_MEAL}</option>
              <option value="KITCHEN_SPOILAGE">{t.types.KITCHEN_SPOILAGE}</option>
              <option value="BREAKAGE_ACCIDENT">{t.types.BREAKAGE_ACCIDENT}</option>
              <option value="BUFFET_LEFTOVER">{t.types.BUFFET_LEFTOVER}</option>
              <option value="VIP_TASTING_DEMO">{t.types.VIP_TASTING_DEMO}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={costCenterId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.costCenter}
            </label>
            <select
              id={costCenterId}
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value as CostCenterAccount)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
            >
              <option value="STAFF_WELFARE_FOOD">{t.costCenters.STAFF_WELFARE_FOOD}</option>
              <option value="KITCHEN_SPOILAGE_EXPENSE">
                {t.costCenters.KITCHEN_SPOILAGE_EXPENSE}
              </option>
              <option value="BEVERAGE_BREAKAGE_EXPENSE">
                {t.costCenters.BEVERAGE_BREAKAGE_EXPENSE}
              </option>
              <option value="BANQUET_OVERFLOW_COST">{t.costCenters.BANQUET_OVERFLOW_COST}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label
              htmlFor={itemId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.stockItem}
            </label>
            <input
              id={itemId}
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor={skuId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              SKU Reference
            </label>
            <input
              id={skuId}
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor={uomId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              Unit of Measure
            </label>
            <select
              id={uomId}
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value as StockUom)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
            >
              <option value="kg">kg (Kilograms)</option>
              <option value="g">g (Grams)</option>
              <option value="L">L (Liters)</option>
              <option value="ml">ml (Milliliters)</option>
              <option value="btl">btl (Bottles)</option>
              <option value="pcs">pcs (Pieces)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={qtyId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.quantity}
            </label>
            <input
              id={qtyId}
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(Number.parseFloat(e.target.value) || 0)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white tabular-nums-lkr text-right"
              required
            />
          </div>

          <div>
            <label
              htmlFor={costId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.unitCost}
            </label>
            <input
              id={costId}
              type="number"
              min="0"
              step="1"
              value={unitCostLkr}
              onChange={(e) => setUnitCostLkr(Number.parseFloat(e.target.value) || 0)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white tabular-nums-lkr text-right"
              required
            />
          </div>

          <div>
            <span className="font-medium text-blue-600 dark:text-blue-400 block mb-1">
              {t.fields.totalCost}
            </span>
            <div className="w-full min-h-[38px] px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold tabular-nums-lkr text-right">
              {formatLkr(totalCostLkr)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={reasonId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.reason}
            </label>
            <select
              id={reasonId}
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as SpoilageReasonCode)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
            >
              <option value="STAFF_LUNCH">{t.reasons.STAFF_LUNCH}</option>
              <option value="STAFF_BREAKFAST">{t.reasons.STAFF_BREAKFAST}</option>
              <option value="STAFF_DINNER">{t.reasons.STAFF_DINNER}</option>
              <option value="COLD_CHAIN_TEMPERATURE_FAILURE">
                {t.reasons.COLD_CHAIN_TEMPERATURE_FAILURE}
              </option>
              <option value="EXPIRED_SHELF_LIFE">{t.reasons.EXPIRED_SHELF_LIFE}</option>
              <option value="TRIMMING_PREPARATION_YIELD">
                {t.reasons.TRIMMING_PREPARATION_YIELD}
              </option>
              <option value="TRANSIT_BREAKAGE">{t.reasons.TRANSIT_BREAKAGE}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={recorderId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.recordedBy}
            </label>
            <input
              id={recorderId}
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor={approverId}
              className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
            >
              {t.fields.approvedBy}
            </label>
            <input
              id={approverId}
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={notesId}
            className="font-medium text-gray-700 dark:text-gray-300 block mb-1"
          >
            {t.fields.notes}
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[50px]"
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="min-h-[44px] px-6 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            data-testid="add-spoilage-entry-button"
          >
            {t.buttons.addEntry}
          </button>
        </div>
      </GlassCard>
    </form>
  );
}

// ============================================================================
// Subcomponent: Print Waste Voucher Tab
// ============================================================================

interface PrintWasteVoucherTabProps {
  readonly t: (typeof SPOILAGE_TRANSLATIONS)["en"];
  readonly entries: readonly SpoilageEntryModel[];
  readonly summary: SpoilageSummaryTotals;
}

function PrintWasteVoucherTab({ t, entries, summary }: PrintWasteVoucherTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.print();
            }
          }}
          className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow hover:opacity-90 transition-opacity"
        >
          🖨️ {t.buttons.printVoucher}
        </button>
      </div>

      <div
        className="p-6 bg-white text-gray-900 border border-gray-300 rounded-xl shadow-xs text-xs printable-voucher"
        data-testid="printable-spoilage-voucher"
      >
        <div className="border-b-2 border-gray-900 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold uppercase tracking-tight">
              Sri Lanka Hospitality — Daily Kitchen Wastage & Staff Meal Voucher
            </h2>
            <p className="text-[10px] text-gray-500">
              Department Store Credit & Inventory Adjustment Certificate
            </p>
          </div>
          <div className="text-right text-[10px]">
            <span className="font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">
              DATE: {new Date().toISOString().slice(0, 10)}
            </span>
          </div>
        </div>

        <table className="w-full text-left mb-6">
          <thead className="border-b border-gray-900 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-1.5">Item / SKU</th>
              <th className="py-1.5">Type</th>
              <th className="py-1.5 text-right">Quantity</th>
              <th className="py-1.5 text-right">Unit Cost</th>
              <th className="py-1.5 text-right">Write-Off (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.entryId}>
                <td className="py-1.5">
                  <span className="font-medium block">{entry.itemName}</span>
                  <span className="text-[9px] text-gray-500">
                    {entry.sku} • {entry.reasonCode}
                  </span>
                </td>
                <td className="py-1.5">{entry.writeOffType}</td>
                <td className="py-1.5 text-right tabular-nums-lkr">
                  {entry.quantity} {entry.unitOfMeasure}
                </td>
                <td className="py-1.5 text-right tabular-nums-lkr">
                  {formatLkr(entry.unitCostLkr)}
                </td>
                <td className="py-1.5 text-right tabular-nums-lkr font-bold">
                  {formatLkr(entry.totalCostLkr)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-900 font-bold">
            <tr>
              <td colSpan={4} className="py-2">
                Total Daily Write-Off Value:
              </td>
              <td className="py-2 text-right tabular-nums-lkr">
                {formatLkr(summary.totalWriteOffCostLkr)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Expense Split */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-[10px] mb-6">
          <div>
            <span className="font-semibold text-gray-600 block">Staff Meals (Welfare):</span>
            <span className="font-bold text-emerald-700">
              {formatLkr(summary.staffMealCostLkr)}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-600 block">Kitchen Spoilage (Loss):</span>
            <span className="font-bold text-rose-700">{formatLkr(summary.spoilageCostLkr)}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600 block">Bar Breakage:</span>
            <span className="font-bold text-amber-700">{formatLkr(summary.breakageCostLkr)}</span>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-300 text-[10px]">
          <div>
            <p className="font-semibold text-gray-700">Prepared By (Sous Chef):</p>
            <div className="border-b border-gray-400 h-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Approved By (Exec Chef):</p>
            <div className="border-b border-gray-400 h-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">F&B Controller Sign-Off:</p>
            <div className="border-b border-gray-400 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
