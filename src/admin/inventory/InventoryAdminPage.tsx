/**
 * Unified Store Inventory, Procurement & Cost Control Page (`InventoryAdminPage.tsx`)
 *
 * Implements Step 398 (Phase 16.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Unified executive command center for Sri Lankan resort storekeeping, procurement lifecycle
 * (`PR -> PO -> GRN -> GIN -> Return`), FIFO batch costing, bar peg audits, and F&B cost control:
 *
 * - Tabbed workspace coordinating:
 *   1. Stock Registry & Holdings (`StockItemManager`, `ExpiryAlertCard`, `ReturnableContainerCard`)
 *   2. Procurement & Vouchers (PR, PO, GRN, GIN, Debit Note triggers & `PrintableStoreVoucher`)
 *   3. Liquor & Bar Peg Audit (`BarPegAuditView`)
 *   4. Physical Stock-Take & Wastage (`StockTakeVarianceView` + `SpoilageAndStaffMealModal`)
 *   5. Suppliers & Accounts Payable (`SupplierPayablesView` + `SupplierDirectory`)
 *   6. Daily F&B Cost Analytics (`FnbFlashCostCard`)
 * - Executive action triggers:
 *   - Purchase Requisition Modal (`PurchaseRequisitionModal`)
 *   - Purchase Order Modal (`PurchaseOrderModal`)
 *   - Goods Received Note Modal (`GrnModal`)
 *   - Goods Issue Note Modal (`GinTransferModal`)
 *   - Return-to-Supplier / Debit Note Modal (`GoodsReturnModal`)
 *   - Smartphone Barcode Scanner Modal (`StoreScannerInput`)
 * - Executive Overview KPI Ribbon (`.tabular-nums-lkr`, inventory valuation, AP exposure, F&B cost %)
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: `.apple-liquid-glass`, SF Pro typography, >=44x44pt touch targets
 * - Strictly zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { type SupportedLanguage, formatLkr } from "../../lib/i18n.js";
import { BarPegAuditView } from "./BarPegAuditView.js";
import { ExpiryAlertCard } from "./ExpiryAlertCard.js";
import { FnbFlashCostCard } from "./FnbFlashCostCard.js";
import { GinTransferModal } from "./GinTransferModal.js";
import { GoodsReturnModal } from "./GoodsReturnModal.js";
import { GrnModal } from "./GrnModal.js";
import { PrintableStoreVoucher } from "./PrintableStoreVoucher.js";
import { PurchaseOrderModal } from "./PurchaseOrderModal.js";
import { PurchaseRequisitionModal } from "./PurchaseRequisitionModal.js";
import { ReturnableContainerCard } from "./ReturnableContainerCard.js";
import { SpoilageAndStaffMealModal } from "./SpoilageAndStaffMealModal.js";
import { StockItemManager } from "./StockItemManager.js";
import { StockTakeVarianceView } from "./StockTakeVarianceView.js";
import { StoreScannerInput } from "./StoreScannerInput.js";
import { SupplierDirectory } from "./SupplierDirectory.js";
import { SupplierPayablesView } from "./SupplierPayablesView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type InventoryAdminTabId =
  | "STOCK_REGISTRY"
  | "PROCUREMENT"
  | "BAR_AUDIT"
  | "STOCK_TAKE"
  | "PAYABLES"
  | "COST_CONTROL";

export interface InventoryAdminTab {
  readonly id: InventoryAdminTabId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly badge?: string | undefined;
}

export interface InventoryOverviewMetrics {
  readonly totalValuationLkr: number;
  readonly totalActiveSkus: number;
  readonly pendingRequisitions: number;
  readonly outstandingPayablesLkr: number;
  readonly dailyFnbCostPercent: number;
  readonly criticalExpiryBatches: number;
}

export interface InventoryAdminPageProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly initialTab?: InventoryAdminTabId | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onTabChange?: ((tab: InventoryAdminTabId) => void) | undefined;
  readonly className?: string | undefined;
  readonly testId?: string | undefined;
}

// ============================================================================
// Default Constants & Presets
// ============================================================================

export const DEFAULT_INVENTORY_METRICS: InventoryOverviewMetrics = {
  totalValuationLkr: 18450200,
  totalActiveSkus: 142,
  pendingRequisitions: 4,
  outstandingPayablesLkr: 3240000,
  dailyFnbCostPercent: 31.4,
  criticalExpiryBatches: 4,
};

export const INVENTORY_TABS: readonly InventoryAdminTab[] = [
  {
    id: "STOCK_REGISTRY",
    label: "Stock Registry & Containers",
    shortLabel: "Stock Registry",
    icon: "📦",
    badge: "142",
  },
  {
    id: "PROCUREMENT",
    label: "Procurement & Vouchers",
    shortLabel: "Procurement",
    icon: "📑",
    badge: "4",
  },
  {
    id: "BAR_AUDIT",
    label: "Liquor & Bar Peg Audit",
    shortLabel: "Bar Audit",
    icon: "🍷",
  },
  {
    id: "STOCK_TAKE",
    label: "Stock-Take & Wastage",
    shortLabel: "Stock-Take",
    icon: "⚖️",
  },
  {
    id: "PAYABLES",
    label: "Suppliers & AP Ledger",
    shortLabel: "Suppliers & AP",
    icon: "💳",
  },
  {
    id: "COST_CONTROL",
    label: "F&B Cost Analytics",
    shortLabel: "F&B Costs",
    icon: "📊",
    badge: "31.4%",
  },
];

// ============================================================================
// Trilingual Page Localization Dictionary
// ============================================================================

export interface InventoryPageI18n {
  readonly pageTitle: string;
  readonly pageSubtitle: string;
  readonly quickActions: {
    readonly newPr: string;
    readonly newPo: string;
    readonly newGrn: string;
    readonly newGin: string;
    readonly newDebitNote: string;
    readonly scanBarcode: string;
    readonly logWastage: string;
  };
  readonly kpi: {
    readonly totalValuation: string;
    readonly activeSkus: string;
    readonly pendingPrs: string;
    readonly outstandingAp: string;
    readonly fnbCost: string;
    readonly criticalFefo: string;
  };
  readonly tabs: Record<InventoryAdminTabId, string>;
  readonly sections: {
    readonly fefoAlerts: string;
    readonly containers: string;
    readonly voucherCenter: string;
    readonly supplierHub: string;
  };
}

export const INVENTORY_PAGE_TRANSLATIONS: Record<SupportedLanguage, InventoryPageI18n> = {
  en: {
    pageTitle: "Store Inventory, Procurement & Cost Control Hub",
    pageSubtitle:
      "Enterprise multi-tenant storekeeping, FIFO batch costing, PR/PO/GRN/GIN procurement, and kitchen wastage control",
    quickActions: {
      newPr: "+ Requisition (PR)",
      newPo: "+ Purchase Order (PO)",
      newGrn: "+ Receive Stock (GRN)",
      newGin: "+ Issue to Kitchen (GIN)",
      newDebitNote: "+ Debit Note / Return",
      scanBarcode: "📱 Scan Barcode",
      logWastage: "🗑️ Log Spoilage",
    },
    kpi: {
      totalValuation: "Total Stock Valuation",
      activeSkus: "Active Master SKUs",
      pendingPrs: "Pending Approvals",
      outstandingAp: "Unsettled AP Payables",
      fnbCost: "Today's F&B Cost %",
      criticalFefo: "FEFO Alerts (<72h)",
    },
    tabs: {
      STOCK_REGISTRY: "Stock Registry & Containers",
      PROCUREMENT: "Procurement & Vouchers",
      BAR_AUDIT: "Liquor & Bar Peg Audit",
      STOCK_TAKE: "Stock-Take & Wastage",
      PAYABLES: "Suppliers & AP Ledger",
      COST_CONTROL: "F&B Cost Analytics",
    },
    sections: {
      fefoAlerts: "Cold-Room FEFO Expiry Alerts",
      containers: "Returnable LPG Gas Cylinders & Beverage Crates",
      voucherCenter: "Official Printable A4 Voucher Center",
      supplierHub: "Vendor Directory & Accounts Payable Register",
    },
  },
  si: {
    pageTitle: "ගබඩා තොග, මිලදී ගැනීම් සහ පිරිවැය පාලන මධ්‍යස්ථානය",
    pageSubtitle:
      "හෝටල් ගබඩා කළමනාකරණය, FIFO කණ්ඩායම් පිරිවැය, PR/PO/GRN/GIN ක්‍රියාවලිය සහ මුළුතැන්ගෙයි අපතේ යාම් පාලනය",
    quickActions: {
      newPr: "+ ඉල්ලුම්පත (PR)",
      newPo: "+ ඇණවුම (PO)",
      newGrn: "+ ලැබීම (GRN)",
      newGin: "+ නිකුත් කිරීම (GIN)",
      newDebitNote: "+ හර සටහන / ආපසු",
      scanBarcode: "📱 බාර්කෝඩ් ස්කෑනරය",
      logWastage: "🗑️ අපතේ යාම් සටහන",
    },
    kpi: {
      totalValuation: "මුළු තොග වටිනාකම",
      activeSkus: "ක්‍රියාකාරී SKU ගණන",
      pendingPrs: "අනුමැතියට නියමිත",
      outstandingAp: "නොගෙවූ බිල්පත්",
      fnbCost: "අද F&B පිරිවැය %",
      criticalFefo: "FEFO ඇඟවීම් (<පැය 72)",
    },
    tabs: {
      STOCK_REGISTRY: "තොග ලේඛනය සහ සිලින්ඩර",
      PROCUREMENT: "මිලදී ගැනීම් සහ වවුචර",
      BAR_AUDIT: "මධ්‍යසාර සහ බාර් පරීක්ෂාව",
      STOCK_TAKE: "භෞතික තොග ගණනය",
      PAYABLES: "සැපයුම්කරුවන් සහ ගෙවීම්",
      COST_CONTROL: "ආහාර පාන පිරිවැය විශ්ලේෂණය",
    },
    sections: {
      fefoAlerts: "ශීතකරණ FEFO කල් ඉකුත්වීම් ඇඟවීම්",
      containers: "LPG ගෑස් සිලින්ඩර සහ බියර් කූඩ ලුහුබැඳීම",
      voucherCenter: "නිල A4 වවුචර් මුද්‍රණ මධ්‍යස්ථානය",
      supplierHub: "සැපයුම්කරු නාමාවලිය සහ ගෙවිය යුතු බිල්පත්",
    },
  },
  ta: {
    pageTitle: "களஞ்சிய கையிருப்பு, கொள்முதல் & செலவு கட்டுப்பாட்டு மையம்",
    pageSubtitle:
      "நட்சத்திர விடுதி களஞ்சிய மேலாண்மை, FIFO தொகுதி செலவு கணக்கீடு, PR/PO/GRN/GIN கொள்முதல் மற்றும் வீணாதல் கட்டுப்பாடு",
    quickActions: {
      newPr: "+ கோரிக்கை (PR)",
      newPo: "+ கொள்முதல் ஆணை (PO)",
      newGrn: "+ பொருள் பெறுதல் (GRN)",
      newGin: "+ வழங்குதல் (GIN)",
      newDebitNote: "+ பற்று குறிப்பு",
      scanBarcode: "📱 பார்-குறியீடு ஸ்கேனர்",
      logWastage: "🗑️ சேதம் பதிவு",
    },
    kpi: {
      totalValuation: "மொத்த கையிருப்பு மதிப்பு",
      activeSkus: "செயலில் உள்ள SKUகள்",
      pendingPrs: "ஒப்புதலுக்கு நிலுவையில்",
      outstandingAp: "செலுத்தப்படாத பில்கள்",
      fnbCost: "இன்றைய F&B செலவு %",
      criticalFefo: "FEFO எச்சரிக்கைகள் (<72 மணி)",
    },
    tabs: {
      STOCK_REGISTRY: "கையிருப்பு & சிலிண்டர்கள்",
      PROCUREMENT: "கொள்முதல் & ரசீதுகள்",
      BAR_AUDIT: "மதுபான அளவீடு & தணிக்கை",
      STOCK_TAKE: "நேரடி கையிருப்பு சரிபார்ப்பு",
      PAYABLES: "வழங்குநர்கள் & பற்று லெட்ஜர்",
      COST_CONTROL: "உணவு பான செலவு பகுப்பாய்வு",
    },
    sections: {
      fefoAlerts: "குளிர் அறை FEFO காலாவதி எச்சரிக்கைகள்",
      containers: "மீளளிக்கக்கூடிய LPG சிலிண்டர்கள் & பெட்டிகள்",
      voucherCenter: "அதிகாரப்பூர்வ A4 ரசீது மையம்",
      supplierHub: "வழங்குநர் அடைவு & செலுத்த வேண்டியவை",
    },
  },
};

// ============================================================================
// Subcomponents
// ============================================================================

interface InventoryHeaderBarProps {
  readonly i18n: InventoryPageI18n;
  readonly propertyTitle?: string | undefined;
  readonly onOpenPr: () => void;
  readonly onOpenPo: () => void;
  readonly onOpenGrn: () => void;
  readonly onOpenGin: () => void;
  readonly onOpenDebitNote: () => void;
  readonly onOpenScanner: () => void;
  readonly onOpenWastage: () => void;
}

const InventoryHeaderBar: FC<InventoryHeaderBarProps> = ({
  i18n,
  propertyTitle,
  onOpenPr,
  onOpenPo,
  onOpenGrn,
  onOpenGin,
  onOpenDebitNote,
  onOpenScanner,
  onOpenWastage,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Warehouse Box">
            📦
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">{i18n.pageTitle}</h1>
        </div>
        <p className="text-xs text-white/60 mt-1 max-w-2xl">
          {propertyTitle ? `${propertyTitle} • ` : ""}
          {i18n.pageSubtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenScanner}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.scanBarcode}
        </button>

        <button
          type="button"
          onClick={onOpenPr}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.newPr}
        </button>

        <button
          type="button"
          onClick={onOpenPo}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.newPo}
        </button>

        <button
          type="button"
          onClick={onOpenGrn}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.newGrn}
        </button>

        <button
          type="button"
          onClick={onOpenGin}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.newGin}
        </button>

        <button
          type="button"
          onClick={onOpenDebitNote}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.newDebitNote}
        </button>

        <button
          type="button"
          onClick={onOpenWastage}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow transition-all min-h-[44px] cursor-pointer"
        >
          {i18n.quickActions.logWastage}
        </button>
      </div>
    </div>
  );
};

interface InventoryKpiRibbonProps {
  readonly i18n: InventoryPageI18n;
  readonly metrics: InventoryOverviewMetrics;
}

const InventoryKpiRibbon: FC<InventoryKpiRibbonProps> = ({ i18n, metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-white/50 block font-medium">
          {i18n.kpi.totalValuation}
        </span>
        <div className="text-base font-bold text-white tabular-nums mt-0.5 font-mono">
          {formatLkr(metrics.totalValuationLkr)}
        </div>
      </GlassCard>

      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-white/50 block font-medium">{i18n.kpi.activeSkus}</span>
        <div className="text-lg font-bold text-white tabular-nums mt-0.5">
          {metrics.totalActiveSkus} SKUs
        </div>
      </GlassCard>

      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-amber-400 block font-medium">{i18n.kpi.pendingPrs}</span>
        <div className="text-lg font-bold text-amber-300 tabular-nums mt-0.5">
          {metrics.pendingRequisitions} Pending
        </div>
      </GlassCard>

      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-purple-400 block font-medium">
          {i18n.kpi.outstandingAp}
        </span>
        <div className="text-base font-bold text-purple-300 tabular-nums mt-0.5 font-mono">
          {formatLkr(metrics.outstandingPayablesLkr)}
        </div>
      </GlassCard>

      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-emerald-400 block font-medium">{i18n.kpi.fnbCost}</span>
        <div className="text-lg font-bold text-emerald-300 tabular-nums mt-0.5 font-mono">
          {metrics.dailyFnbCostPercent.toFixed(1)}%
        </div>
      </GlassCard>

      <GlassCard className="p-3.5 rounded-xl border border-white/10 bg-slate-900/50">
        <span className="text-[11px] text-rose-400 block font-medium">{i18n.kpi.criticalFefo}</span>
        <div className="text-lg font-bold text-rose-300 tabular-nums mt-0.5">
          {metrics.criticalExpiryBatches} Critical
        </div>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// Main Page Component: InventoryAdminPage
// ============================================================================

export const InventoryAdminPage: FC<InventoryAdminPageProps> = ({
  propertyTitle = "Colombo Grand Heritage Hotel & Resort",
  initialTab = "STOCK_REGISTRY",
  language = "en",
  onTabChange,
  className = "",
  testId = "inventory-admin-page",
}) => {
  const i18n = INVENTORY_PAGE_TRANSLATIONS[language] ?? INVENTORY_PAGE_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<InventoryAdminTabId>(initialTab);

  // Modal Visibility States
  const [isPrOpen, setIsPrOpen] = useState(false);
  const [isPoOpen, setIsPoOpen] = useState(false);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [isGinOpen, setIsGinOpen] = useState(false);
  const [isDebitNoteOpen, setIsDebitNoteOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWastageOpen, setIsWastageOpen] = useState(false);

  const scannerDialogId = useId();

  const tabOptions = useMemo<SegmentedControlOption<InventoryAdminTabId>[]>(() => {
    return INVENTORY_TABS.map((t) => ({
      id: t.id,
      label: `${t.icon} ${i18n.tabs[t.id] ?? t.shortLabel}`,
      badge: t.badge,
    }));
  }, [i18n]);

  function handleTabSelect(tab: InventoryAdminTabId) {
    setActiveTab(tab);
    onTabChange?.(tab);
  }

  const handleModalSave = () => {
    // Action handler for embedded modal completions
  };

  return (
    <div
      data-testid={testId}
      className={`space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 ${className}`}
    >
      {/* 1. Header Bar with Global Quick Action Triggers */}
      <InventoryHeaderBar
        i18n={i18n}
        propertyTitle={propertyTitle}
        onOpenPr={() => setIsPrOpen(true)}
        onOpenPo={() => setIsPoOpen(true)}
        onOpenGrn={() => setIsGrnOpen(true)}
        onOpenGin={() => setIsGinOpen(true)}
        onOpenDebitNote={() => setIsDebitNoteOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenWastage={() => setIsWastageOpen(true)}
      />

      {/* 2. Executive Overview 6-Metric KPI Ribbon */}
      <InventoryKpiRibbon i18n={i18n} metrics={DEFAULT_INVENTORY_METRICS} />

      {/* 3. Primary Segmented Navigation Bar */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={handleTabSelect}
          size="md"
        />
      </div>

      {/* 4. Tab Workspace Content */}
      <div className="space-y-6 min-h-[600px]">
        {/* Tab 1: Stock Registry, FEFO Alerts & Gas/Crate Containers */}
        {activeTab === "STOCK_REGISTRY" && (
          <div className="space-y-6">
            <ExpiryAlertCard />
            <StockItemManager />
            <ReturnableContainerCard locale={language} />
          </div>
        )}

        {/* Tab 2: Procurement Lifecycle Hub & Printable Store Vouchers */}
        {activeTab === "PROCUREMENT" && (
          <div className="space-y-6">
            <GlassCard className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white">{i18n.sections.voucherCenter}</h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Generate and print official A4 Goods Received Notes (GRN), Goods Issue Notes
                    (GIN), and Purchase Orders (PO)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPoOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white min-h-[44px] cursor-pointer"
                  >
                    {i18n.quickActions.newPo}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGrnOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px] cursor-pointer"
                  >
                    {i18n.quickActions.newGrn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGinOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white min-h-[44px] cursor-pointer"
                  >
                    {i18n.quickActions.newGin}
                  </button>
                </div>
              </div>
            </GlassCard>

            <PrintableStoreVoucher initialVoucherType="GRN" language={language} />
          </div>
        )}

        {/* Tab 3: Liquor & Bar Peg Audit */}
        {activeTab === "BAR_AUDIT" && (
          <div className="space-y-6">
            <BarPegAuditView />
          </div>
        )}

        {/* Tab 4: Physical Stock-Take & Wastage Log */}
        {activeTab === "STOCK_TAKE" && (
          <div className="space-y-6">
            <StockTakeVarianceView />
          </div>
        )}

        {/* Tab 5: Suppliers & Accounts Payable Ledger */}
        {activeTab === "PAYABLES" && (
          <div className="space-y-6">
            <SupplierPayablesView />
            <SupplierDirectory />
          </div>
        )}

        {/* Tab 6: Daily F&B Cost Analytics */}
        {activeTab === "COST_CONTROL" && (
          <div className="space-y-6">
            <FnbFlashCostCard />
          </div>
        )}
      </div>

      {/* 5. Integrated Action Modals */}
      <PurchaseRequisitionModal isOpen={isPrOpen} onClose={() => setIsPrOpen(false)} />

      <PurchaseOrderModal
        isOpen={isPoOpen}
        onClose={() => setIsPoOpen(false)}
        onSavePo={handleModalSave}
      />

      <GrnModal
        isOpen={isGrnOpen}
        onClose={() => setIsGrnOpen(false)}
        onSaveGrn={handleModalSave}
      />

      <GinTransferModal
        isOpen={isGinOpen}
        onClose={() => setIsGinOpen(false)}
        onSaveGin={handleModalSave}
      />

      <GoodsReturnModal
        isOpen={isDebitNoteOpen}
        onClose={() => setIsDebitNoteOpen(false)}
        locale={language}
      />

      <SpoilageAndStaffMealModal isOpen={isWastageOpen} onClose={() => setIsWastageOpen(false)} />

      {/* Mobile Barcode Scanner Modal Wrapper */}
      <DialogModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title={i18n.quickActions.scanBarcode}
        size="lg"
      >
        <div id={scannerDialogId} className="space-y-3">
          <StoreScannerInput
            language={language}
            onCommitStagedLines={() => {
              setIsScannerOpen(false);
            }}
          />
        </div>
      </DialogModal>
    </div>
  );
};
