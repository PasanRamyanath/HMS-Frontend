import { useId, useMemo, useState } from "react";
import { formatLkr } from "../../lib/i18n.js";
import { AccountingExportView } from "./AccountingExportView.js";
import { AuditArchiveList } from "./AuditArchiveList.js";
import { IrdTaxReturnView } from "./IrdTaxReturnView.js";
import { ManagerFlashReportView } from "./ManagerFlashReportView.js";
import { NightAuditWizard } from "./NightAuditWizard.js";
import { PrintableSltdaForms } from "./PrintableSltdaForms.js";
import { RevenueMatrixView } from "./RevenueMatrixView.js";
import { SecurityAuditReport } from "./SecurityAuditReport.js";
import { SltdaMonthlyReportView } from "./SltdaMonthlyReportView.js";
import { SourceMarketReport } from "./SourceMarketReport.js";
import { SustainabilityReportCard } from "./SustainabilityReportCard.js";
import { TdlQuarterlyReportView } from "./TdlQuarterlyReportView.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type ReportsAdminTabId =
  | "GM_FLASH"
  | "NIGHT_AUDIT"
  | "AUDIT_ARCHIVE"
  | "SLTDA_OCCUPANCY"
  | "TDL_QUARTERLY"
  | "PRINTABLE_STATUTORY"
  | "IRD_TAX_RETURNS"
  | "REVENUE_MATRIX"
  | "DMC_LEADERBOARD"
  | "SECURITY_AUDIT"
  | "SUSTAINABILITY"
  | "ACCOUNTING_EXPORT";

interface ReportsAdminTabMeta {
  readonly id: ReportsAdminTabId;
  readonly label: string;
  readonly category:
    | "DAILY_AUDIT"
    | "STATUTORY_COMPLIANCE"
    | "REVENUE_INTELLIGENCE"
    | "FINANCE_LEDGER";
  readonly icon: string;
  readonly description: string;
}

export interface ReportsOverviewKpis {
  readonly todayGrossRevenueLkr: number;
  readonly todayOccupancyPercent: number;
  readonly mtdGrossRevenueLkr: number;
  readonly mtdOccupancyPercent: number;
  readonly quarterlyTdlPayableLkr: number;
  readonly monthlyVatPayableLkr: number;
  readonly ledgerHashChainStatus: "INTACT" | "NEEDS_ATTENTION";
}

export interface ReportsAdminPageProps {
  readonly tenantId?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly sltdaRegNo?: string | undefined;
  readonly initialTab?: ReportsAdminTabId | undefined;
  readonly onTabChange?: ((tab: ReportsAdminTabId) => void) | undefined;
  readonly kpis?: ReportsOverviewKpis | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Tab Metadata Registry
// ============================================================================

export const REPORTS_TAB_REGISTRY: readonly ReportsAdminTabMeta[] = [
  {
    id: "GM_FLASH",
    label: "GM Daily Flash",
    category: "DAILY_AUDIT",
    icon: "⚡",
    description: "Daily and month-to-date executive revenue, ADR, RevPAR, and guest arrivals flash",
  },
  {
    id: "NIGHT_AUDIT",
    label: "Night Audit Wizard",
    category: "DAILY_AUDIT",
    icon: "🌙",
    description:
      "Pre-audit verification checklist, automated room charge posting, and business date rollover",
  },
  {
    id: "AUDIT_ARCHIVE",
    label: "Night Audit Archive",
    category: "DAILY_AUDIT",
    icon: "🏛️",
    description:
      "Historical Night Audit snapshots, tamper-evident SHA-256 ledger chains, and reprint browser",
  },
  {
    id: "SLTDA_OCCUPANCY",
    label: "SLTDA Monthly Census",
    category: "STATUTORY_COMPLIANCE",
    icon: "🇱🇰",
    description:
      "Statutory Sri Lanka Tourism Development Authority occupancy return and foreign origin breakdown",
  },
  {
    id: "TDL_QUARTERLY",
    label: "SLTDA TDL Return",
    category: "STATUTORY_COMPLIANCE",
    icon: "📋",
    description:
      "Quarterly Tourism Development Levy (1.0% / 0.5%) declaration and BOC fund payment verification",
  },
  {
    id: "PRINTABLE_STATUTORY",
    label: "Printable Official Forms",
    category: "STATUTORY_COMPLIANCE",
    icon: "🖨️",
    description:
      "A4 official statutory returns (Form A & Form TDL-1) with GM signature and corporate seal blocks",
  },
  {
    id: "IRD_TAX_RETURNS",
    label: "IRD VAT & SSCL",
    category: "STATUTORY_COMPLIANCE",
    icon: "🧾",
    description: "Inland Revenue Department RAMIS-ready schedules for VAT 18% and SSCL 2.5%",
  },
  {
    id: "REVENUE_MATRIX",
    label: "Revenue Matrix",
    category: "REVENUE_INTELLIGENCE",
    icon: "📊",
    description:
      "Department-wise revenue cross-tabulation by settlement tender, MDR costs, and drawer balancing",
  },
  {
    id: "DMC_LEADERBOARD",
    label: "DMC & Origin Markets",
    category: "REVENUE_INTELLIGENCE",
    icon: "🌍",
    description:
      "Travel agent production, tour operator credit tracking, and nationality source leaderboard",
  },
  {
    id: "SECURITY_AUDIT",
    label: "Security & Overrides",
    category: "FINANCE_LEDGER",
    icon: "🛡️",
    description:
      "Audit trail for KOT voids, folio rebates, manager rate discounts, and tax parameter overrides",
  },
  {
    id: "SUSTAINABILITY",
    label: "Green Sustainability",
    category: "FINANCE_LEDGER",
    icon: "🌿",
    description:
      "Central Environmental Authority EPL and SLTDA Green Certification resource intensity metrics",
  },
  {
    id: "ACCOUNTING_EXPORT",
    label: "GL Accounting Export",
    category: "FINANCE_LEDGER",
    icon: "💼",
    description: "General ledger journal mapping and CSV export for QuickBooks, Xero, and Sage",
  },
];

const DEFAULT_REPORTS_KPIS: ReportsOverviewKpis = {
  todayGrossRevenueLkr: 11307110,
  todayOccupancyPercent: 89.31,
  mtdGrossRevenueLkr: 240075000,
  mtdOccupancyPercent: 85.01,
  quarterlyTdlPayableLkr: 7318900,
  monthlyVatPayableLkr: 34500000,
  ledgerHashChainStatus: "INTACT",
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function getReportsTabDefinition(tabId: ReportsAdminTabId): ReportsAdminTabMeta {
  const match = REPORTS_TAB_REGISTRY.find((t) => t.id === tabId);
  return (
    match ?? {
      id: "GM_FLASH",
      label: "GM Daily Flash",
      category: "DAILY_AUDIT",
      icon: "⚡",
      description:
        "Daily and month-to-date executive revenue, ADR, RevPAR, and guest arrivals flash",
    }
  );
}

export function calculateReportsOverviewKpis(
  customKpis?: Partial<ReportsOverviewKpis>,
): ReportsOverviewKpis {
  return {
    ...DEFAULT_REPORTS_KPIS,
    ...(customKpis ?? {}),
  };
}

// ============================================================================
// Internal UI Subcomponents
// ============================================================================

interface OverviewRibbonProps {
  readonly kpis: ReportsOverviewKpis;
}

function OverviewRibbon({ kpis }: OverviewRibbonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Today Gross Revenue
          </span>
          <span className="text-xs">⚡</span>
        </div>
        <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
          {formatLkr(kpis.todayGrossRevenueLkr)}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
          Occupancy: {kpis.todayOccupancyPercent.toFixed(1)}%
        </span>
      </div>

      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            MTD Revenue
          </span>
          <span className="text-xs">📈</span>
        </div>
        <span className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1 block truncate">
          {formatLkr(kpis.mtdGrossRevenueLkr)}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
          MTD Avg: {kpis.mtdOccupancyPercent.toFixed(1)}%
        </span>
      </div>

      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Statutory Taxes Due
          </span>
          <span className="text-xs">🏛️</span>
        </div>
        <span className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block truncate">
          {formatLkr(kpis.quarterlyTdlPayableLkr)}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5 truncate font-mono">
          TDL Qtr • VAT {formatLkr(kpis.monthlyVatPayableLkr)}
        </span>
      </div>

      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Audit Ledger Trail
          </span>
          <span className="text-xs">🛡️</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {kpis.ledgerHashChainStatus === "INTACT" ? "Tamper-Evident Intact" : "Audit Alert"}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
          SHA-256 Chained • 42 Entities
        </span>
      </div>
    </div>
  );
}

interface TabNavigationPillsProps {
  readonly activeTab: ReportsAdminTabId;
  readonly onSelectTab: (tab: ReportsAdminTabId) => void;
}

function TabNavigationPills({ activeTab, onSelectTab }: TabNavigationPillsProps) {
  return (
    <div className="p-2 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max">
        {REPORTS_TAB_REGISTRY.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Master ReportsAdminPage Component
// ============================================================================

export function ReportsAdminPage({
  tenantId = "cinnamon-bentota-beach",
  hotelName = "Cinnamon Bentota Beach Resort",
  sltdaRegNo = "SLTDA/SQA/PRO/00892",
  initialTab = "GM_FLASH",
  onTabChange,
  kpis = DEFAULT_REPORTS_KPIS,
  className = "",
}: ReportsAdminPageProps) {
  const containerId = useId();
  const [activeTab, setActiveTab] = useState<ReportsAdminTabId>(initialTab);

  const handleTabSelect = (tab: ReportsAdminTabId) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const activeTabMeta = useMemo(() => {
    return getReportsTabDefinition(activeTab);
  }, [activeTab]);

  return (
    <div id={containerId} className={`w-full max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Finance, Night Audit &amp; Statutory Compliance Cockpit
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hotelName} • SLTDA: <span className="font-mono">{sltdaRegNo}</span> • Multi-Tenant ID:{" "}
            <span className="font-mono">{tenantId}</span>
          </p>
        </div>

        {/* Tab badge & quick description */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <span>{activeTabMeta.icon}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activeTabMeta.label}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate hidden lg:inline">
            {activeTabMeta.description}
          </span>
        </div>
      </div>

      {/* Overview KPI Ribbon */}
      <OverviewRibbon kpis={kpis} />

      {/* Tab Navigation Navigation Bar */}
      <TabNavigationPills activeTab={activeTab} onSelectTab={handleTabSelect} />

      {/* Tab Content Panels */}
      <div className="transition-all duration-300">
        {activeTab === "GM_FLASH" && <ManagerFlashReportView />}

        {activeTab === "NIGHT_AUDIT" && (
          <NightAuditWizard tenantId={tenantId} currentBusinessDate="2026-10-31" />
        )}

        {activeTab === "AUDIT_ARCHIVE" && (
          <AuditArchiveList hotelName={hotelName} sltdaRegNo={sltdaRegNo} />
        )}

        {activeTab === "SLTDA_OCCUPANCY" && <SltdaMonthlyReportView />}

        {activeTab === "TDL_QUARTERLY" && <TdlQuarterlyReportView />}

        {activeTab === "PRINTABLE_STATUTORY" && <PrintableSltdaForms />}

        {activeTab === "IRD_TAX_RETURNS" && <IrdTaxReturnView />}

        {activeTab === "REVENUE_MATRIX" && <RevenueMatrixView />}

        {activeTab === "DMC_LEADERBOARD" && <SourceMarketReport />}

        {activeTab === "SECURITY_AUDIT" && <SecurityAuditReport />}

        {activeTab === "SUSTAINABILITY" && <SustainabilityReportCard />}

        {activeTab === "ACCOUNTING_EXPORT" && <AccountingExportView />}
      </div>
    </div>
  );
}
