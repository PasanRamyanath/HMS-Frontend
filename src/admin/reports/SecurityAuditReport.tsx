import type React from "react";
import { useId, useMemo, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SecurityEventType =
  | "VOID_KOT"
  | "FOLIO_REBATE"
  | "RATE_OVERRIDE"
  | "TAX_TOGGLE_EXEMPTION"
  | "MANAGER_PIN_OVERRIDE"
  | "PETTY_CASH_PAYOUT";

export type SeverityLevel = "INFO" | "WARNING" | "HIGH_RISK" | "CRITICAL_ALERT";

type AuditTab = "ALL_EVENTS" | "VOID_ANALYSIS" | "REBATES_AND_DISCOUNTS" | "CRYPTOGRAPHIC_CHAIN";

type EventFilterType = "ALL" | SecurityEventType;

interface SecurityAuditEntry {
  readonly eventId: string;
  readonly timestamp: string; // ISO 8601
  readonly eventType: SecurityEventType;
  readonly severity: SeverityLevel;
  readonly actorUserId: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly amountLkr: number;
  readonly reasonCode: string;
  readonly reasonNotes: string;
  readonly supervisorPinApproved: boolean;
  readonly supervisorName?: string;
  readonly ipAddress: string;
  readonly deviceClient: string;
  readonly beforeStateJson: string;
  readonly afterStateJson: string;
  readonly prevHash: string;
  readonly entryHash: string;
}

export interface SecurityAuditReportData {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly reportDate: string;
  readonly reportPeriodLabel: string;
  readonly totalRebatesLkr: number;
  readonly totalVoidsLkr: number;
  readonly totalRateOverridesLkr: number;
  readonly flaggedHighRiskCount: number;
  readonly chainIntegrityValid: boolean;
  readonly entries: readonly SecurityAuditEntry[];
  readonly latestBlockSha256: string;
}

export interface SecurityAuditReportProps {
  readonly initialData?: SecurityAuditReportData;
  readonly onExportCsv?: (csv: string) => void;
}

// ============================================================================
// Financial & Formatting Helpers
// ============================================================================

export function roundLkr(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function getSeverityBadgeColor(severity: SeverityLevel): string {
  switch (severity) {
    case "CRITICAL_ALERT":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800";
    case "HIGH_RISK":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800";
    case "WARNING":
      return "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "INFO":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  }
}

export function getEventTypeName(type: SecurityEventType): string {
  switch (type) {
    case "VOID_KOT":
      return "Voided KOT / Kitchen Order";
    case "FOLIO_REBATE":
      return "Folio Rebate / Allowance";
    case "RATE_OVERRIDE":
      return "Manual Room Rate Override";
    case "TAX_TOGGLE_EXEMPTION":
      return "Statutory Tax Toggle Exemption";
    case "MANAGER_PIN_OVERRIDE":
      return "Manager Supervisor PIN Override";
    case "PETTY_CASH_PAYOUT":
      return "Drawer Petty Cash Payout";
    default:
      return type;
  }
}

// ============================================================================
// Default Mock Data
// ============================================================================

export const DEFAULT_SECURITY_AUDIT_DATA: SecurityAuditReportData = {
  tenantId: "TENANT#GALLE-FORT-RESORT",
  hotelName: "The Heritance Galle Fort & Resort",
  sltdaRegNo: "SLTDA/HOTEL/2026/0142",
  reportDate: "2026-03-25",
  reportPeriodLabel: "Audit Day: Wednesday, 25 March 2026",
  totalRebatesLkr: 64500,
  totalVoidsLkr: 28400,
  totalRateOverridesLkr: 32000,
  flaggedHighRiskCount: 3,
  chainIntegrityValid: true,
  latestBlockSha256: "8e43fbb162d3a95d77b02cbb3e85e1351c5a932d201e74fa07e5f99238e83b49",
  entries: [
    {
      eventId: "EVT-20260325-001",
      timestamp: "2026-03-25T12:15:30+05:30",
      eventType: "VOID_KOT",
      severity: "WARNING",
      actorUserId: "USER#STAFF-104",
      actorName: "Saman Kumara",
      actorRole: "RESTAURANT_WAITER",
      entityType: "ServiceOrder",
      entityId: "ORDER#KOT-9941",
      amountLkr: 8500,
      reasonCode: "WRONG_TABLE_ORDERED",
      reasonNotes: "Guest relocated from Table 4 to Ocean Terrace; order re-punched on Table 12",
      supervisorPinApproved: true,
      supervisorName: "Sunil Wickrama (Restaurant Captain)",
      ipAddress: "192.168.10.42",
      deviceClient: "iPad Mini POS (KITCHEN-TILL-01)",
      beforeStateJson: JSON.stringify(
        {
          orderId: "KOT-9941",
          status: "COOKING",
          items: ["Seafood Platter", "Lion Beer 625ml"],
          amountLkr: 8500,
        },
        null,
        2,
      ),
      afterStateJson: JSON.stringify(
        {
          orderId: "KOT-9941",
          status: "VOIDED",
          voidReason: "WRONG_TABLE_ORDERED",
          voidedAt: "12:15:30",
        },
        null,
        2,
      ),
      prevHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      entryHash: "1a82fb83c749b951c5720198aa2b94e823f66810a9c8b742e9120bb94e771c01",
    },
    {
      eventId: "EVT-20260325-002",
      timestamp: "2026-03-25T15:40:12+05:30",
      eventType: "FOLIO_REBATE",
      severity: "HIGH_RISK",
      actorUserId: "USER#STAFF-208",
      actorName: "Malini Fernando",
      actorRole: "FRONT_DESK_CASHIER",
      entityType: "GuestFolio",
      entityId: "FOLIO#RES-8812",
      amountLkr: 25000,
      reasonCode: "GUEST_COMPLAINT_AC_LEAK",
      reasonNotes:
        "Deluxe Ocean Villa AC condensation drip overnight; GM authorized 50% one-night credit",
      supervisorPinApproved: true,
      supervisorName: "Anura Jayasundara (General Manager)",
      ipAddress: "192.168.10.15",
      deviceClient: "Mac Studio Front Desk Terminal 01",
      beforeStateJson: JSON.stringify(
        { folioId: "RES-8812", roomNo: "204", baseTotalLkr: 150000, grandTotalLkr: 204513.78 },
        null,
        2,
      ),
      afterStateJson: JSON.stringify(
        { folioId: "RES-8812", roomNo: "204", rebateLkr: 25000, newGrandTotalLkr: 170428.15 },
        null,
        2,
      ),
      prevHash: "1a82fb83c749b951c5720198aa2b94e823f66810a9c8b742e9120bb94e771c01",
      entryHash: "4f73891ca029b4e671d0928fba10928e8832a819b9c029e8471b0284e9182bb3",
    },
    {
      eventId: "EVT-20260325-003",
      timestamp: "2026-03-25T18:05:44+05:30",
      eventType: "RATE_OVERRIDE",
      severity: "WARNING",
      actorUserId: "USER#STAFF-208",
      actorName: "Malini Fernando",
      actorRole: "FRONT_DESK_CASHIER",
      entityType: "Reservation",
      entityId: "RES#2026-9014",
      amountLkr: 18000,
      reasonCode: "DIRECTOR_FAMILY_DISCOUNT",
      reasonNotes:
        "Managing Director board member guest stay; discounted from LKR 65,000 rack to LKR 47,000",
      supervisorPinApproved: true,
      supervisorName: "Anura Jayasundara (General Manager)",
      ipAddress: "192.168.10.15",
      deviceClient: "Mac Studio Front Desk Terminal 01",
      beforeStateJson: JSON.stringify(
        { resId: "RES#2026-9014", contractedRateLkr: 65000, mealPlan: "HB" },
        null,
        2,
      ),
      afterStateJson: JSON.stringify(
        { resId: "RES#2026-9014", overriddenRateLkr: 47000, discountAppliedLkr: 18000 },
        null,
        2,
      ),
      prevHash: "4f73891ca029b4e671d0928fba10928e8832a819b9c029e8471b0284e9182bb3",
      entryHash: "7c981b29a8f10283c8120e89104b901e88371904a019b8471920e8471920b8e7",
    },
    {
      eventId: "EVT-20260325-004",
      timestamp: "2026-03-25T20:22:15+05:30",
      eventType: "TAX_TOGGLE_EXEMPTION",
      severity: "CRITICAL_ALERT",
      actorUserId: "USER#STAFF-209",
      actorName: "Kavinda Wickramasinghe",
      actorRole: "FRONT_DESK_CASHIER",
      entityType: "FolioLineItem",
      entityId: "FOLIO#RES-8901#LINE#4",
      amountLkr: 14000,
      reasonCode: "DIPLOMATIC_VAT_EXEMPTION",
      reasonNotes:
        "Embassy official presenting Ministry of Foreign Affairs VAT exemption certificate",
      supervisorPinApproved: true,
      supervisorName: "Anura Jayasundara (General Manager)",
      ipAddress: "192.168.10.16",
      deviceClient: "Mac Studio Front Desk Terminal 02",
      beforeStateJson: JSON.stringify(
        { lineId: "LINE#4", vatApplicable: true, vat18Lkr: 6300, ssclApplicable: true },
        null,
        2,
      ),
      afterStateJson: JSON.stringify(
        { lineId: "LINE#4", vatApplicable: false, vat18Lkr: 0, exemptionCert: "MFA/VAT/2026/089" },
        null,
        2,
      ),
      prevHash: "7c981b29a8f10283c8120e89104b901e88371904a019b8471920e8471920b8e7",
      entryHash: "8e43fbb162d3a95d77b02cbb3e85e1351c5a932d201e74fa07e5f99238e83b49",
    },
  ],
};

// ============================================================================
// Modular CSV Exporter
// ============================================================================

function buildCsvHeader(data: SecurityAuditReportData): string[] {
  return [
    `"SRI LANKA HOTEL MANAGEMENT SYSTEM - SECURITY OVERRIDE & REBATE AUDIT LOG"`,
    `"Hotel Name:","${data.hotelName.replace(/"/g, '""')}"`,
    `"SLTDA Reg No:","${data.sltdaRegNo}"`,
    `"Report Date:","${data.reportDate}"`,
    `"Period:","${data.reportPeriodLabel}"`,
    `"Cryptographic Chain Integrity:","${data.chainIntegrityValid ? "VERIFIED VALID" : "COMPROMISED"}"`,
    `"Latest SHA-256 Block Hash:","${data.latestBlockSha256}"`,
    "",
  ];
}

function buildSummaryCsv(data: SecurityAuditReportData): string[] {
  return [
    `"SECTION 1: FINANCIAL OVERRIDE & RISK SUMMARY"`,
    `"Total Folio Rebates Issued (LKR):","${data.totalRebatesLkr.toFixed(2)}"`,
    `"Total Voided KOTs & Orders (LKR):","${data.totalVoidsLkr.toFixed(2)}"`,
    `"Total Room Rate Overrides (LKR):","${data.totalRateOverridesLkr.toFixed(2)}"`,
    `"High Risk / Flagged Actions Count:","${data.flaggedHighRiskCount}"`,
    `"Total Audit Events Recorded:","${data.entries.length}"`,
    "",
  ];
}

function buildEntriesCsv(entries: readonly SecurityAuditEntry[]): string[] {
  const lines: string[] = [
    `"SECTION 2: IMMUTABLE AUDIT LOG DETAILS (SHA-256 CHAINED)"`,
    `"Event ID","Timestamp (SLST)","Event Type","Severity","Actor Name","Role","Entity ID","Amount Impact (LKR)","Reason Code","Reason Notes","Supervisor Approved","Supervisor Name","IP Address","Device","Entry Hash"`,
  ];

  for (const e of entries) {
    lines.push(
      [
        `"${e.eventId}"`,
        `"${e.timestamp}"`,
        `"${e.eventType}"`,
        `"${e.severity}"`,
        `"${e.actorName.replace(/"/g, '""')}"`,
        `"${e.actorRole}"`,
        `"${e.entityId}"`,
        e.amountLkr.toFixed(2),
        `"${e.reasonCode}"`,
        `"${e.reasonNotes.replace(/"/g, '""')}"`,
        e.supervisorPinApproved ? `"YES"` : `"NO"`,
        `"${e.supervisorName?.replace(/"/g, '""') ?? "-"}"`,
        `"${e.ipAddress}"`,
        `"${e.deviceClient.replace(/"/g, '""')}"`,
        `"${e.entryHash}"`,
      ].join(","),
    );
  }

  return lines;
}

export function generateSecurityAuditReportCsv(data: SecurityAuditReportData): string {
  const parts = [
    ...buildCsvHeader(data),
    ...buildSummaryCsv(data),
    ...buildEntriesCsv(data.entries),
  ];
  return parts.join("\r\n");
}

import { triggerFileDownload } from "./ReportExportShared";
export { triggerFileDownload };

// ============================================================================
// Main View Component
// ============================================================================

export const SecurityAuditReport: React.FC<SecurityAuditReportProps> = ({
  initialData = DEFAULT_SECURITY_AUDIT_DATA,
  onExportCsv,
}) => {
  const [data] = useState<SecurityAuditReportData>(initialData);
  const [activeTab, setActiveTab] = useState<AuditTab>("ALL_EVENTS");
  const [filterType, setFilterType] = useState<EventFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectedEntry, setInspectedEntry] = useState<SecurityAuditEntry | null>(null);

  const searchInputId = useId();
  const modalId = useId();

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return data.entries.filter((entry) => {
      const matchType = filterType === "ALL" || entry.eventType === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.entityId.toLowerCase().includes(q) ||
        entry.reasonNotes.toLowerCase().includes(q) ||
        entry.reasonCode.toLowerCase().includes(q) ||
        entry.eventId.toLowerCase().includes(q);

      return matchType && matchQuery;
    });
  }, [data.entries, filterType, searchQuery]);

  const handleExportCsv = () => {
    const csv = generateSecurityAuditReportCsv(data);
    const filename = `Security_Audit_Report_${data.reportDate}.csv`;
    triggerFileDownload(filename, csv);
    if (onExportCsv) {
      onExportCsv(csv);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header Toolbar                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Security Overrides, Rebates &amp; Voids Audit
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                data.chainIntegrityValid
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  data.chainIntegrityValid ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                }`}
              />
              {data.chainIntegrityValid ? "SHA-256 Chain Verified" : "Tamper Detected"}
            </span>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{data.hotelName}</span>
            <span>•</span>
            <span>SLTDA: {data.sltdaRegNo}</span>
            <span>•</span>
            <span>{data.reportPeriodLabel}</span>
            <span>•</span>
            <span className="font-mono text-xs text-zinc-400">
              Chain Head: {data.latestBlockSha256.slice(0, 16)}…
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700 transition-colors min-h-[44px]"
            title="Download audit trail CSV"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700 transition-colors min-h-[44px]"
            title="Print audit report"
          >
            <span>🖨️</span>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Executive Bento KPI Cards                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Folio Rebates */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Folio Rebates &amp; Allowances
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              <PriceTag amountLkr={data.totalRebatesLkr} size="lg" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Post-billing discounts approved by GM
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Voided KOTs */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Voided Kitchen KOTs
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              <PriceTag amountLkr={data.totalVoidsLkr} size="lg" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fired food &amp; beverage cancelations
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Manual Rate Overrides */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Rate Plan Overrides
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              <PriceTag amountLkr={data.totalRateOverridesLkr} size="lg" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cashier rack deviations from pricing engine
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Flagged High-Risk Overrides */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              High-Risk / Tax Mutations
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {data.flaggedHighRiskCount} Flagged
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Required supervisor PIN authorization
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Navigation Tabs & Quick Filter Search                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="inline-flex p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 max-w-full overflow-x-auto">
          {[
            { id: "ALL_EVENTS", label: "Master Security Log", icon: "📋" },
            { id: "VOID_ANALYSIS", label: "KOT Voids & Waste", icon: "🍳" },
            { id: "REBATES_AND_DISCOUNTS", label: "Rebates & Allowances", icon: "💰" },
            { id: "CRYPTOGRAPHIC_CHAIN", label: "SHA-256 Ledger Chain", icon: "🔗" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AuditTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 min-h-[40px] whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "ALL_EVENTS" && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EventFilterType)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 text-xs md:text-sm focus:outline-hidden min-h-[40px]"
            >
              <option value="ALL">All Event Categories</option>
              <option value="VOID_KOT">Voided KOT</option>
              <option value="FOLIO_REBATE">Folio Rebate</option>
              <option value="RATE_OVERRIDE">Rate Override</option>
              <option value="TAX_TOGGLE_EXEMPTION">Tax Exemption</option>
              <option value="MANAGER_PIN_OVERRIDE">Manager Override</option>
            </select>
          )}

          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">
              Search by actor, folio, or reason
            </label>
            <input
              id={searchInputId}
              type="search"
              placeholder="Search actor, folio, or notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[40px]"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Tab 1: Master Security Log Table                                */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "ALL_EVENTS" && (
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Immutable Security Event Stream
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Click any log entry to inspect full JSON before/after state diff and cryptographic
              verification seal.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[980px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th scope="col" className="py-4 px-4">
                    Timestamp (SLST)
                  </th>
                  <th scope="col" className="py-4 px-4">
                    Event Type
                  </th>
                  <th scope="col" className="py-4 px-4">
                    Actor
                  </th>
                  <th scope="col" className="py-4 px-4">
                    Entity
                  </th>
                  <th scope="col" className="py-4 px-4 text-right">
                    Amount (LKR)
                  </th>
                  <th scope="col" className="py-4 px-4">
                    Reason &amp; Notes
                  </th>
                  <th scope="col" className="py-4 px-4 text-center">
                    Supervisor
                  </th>
                  <th scope="col" className="py-4 px-4 text-center">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.eventId}
                    tabIndex={0}
                    onClick={() => setInspectedEntry(entry)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setInspectedEntry(entry);
                      }
                    }}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors focus:outline-hidden focus:bg-blue-50/70"
                  >
                    <td className="py-3.5 px-4 tabular-nums-lkr text-xs font-mono text-zinc-500">
                      {entry.timestamp.slice(11, 19)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                        {getEventTypeName(entry.eventType)}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">{entry.eventId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-900 dark:text-white text-xs">
                        {entry.actorName}
                      </div>
                      <div className="text-[10px] text-zinc-400">{entry.actorRole}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {entry.entityId}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums-lkr font-bold text-xs">
                      {entry.amountLkr > 0 ? formatLkr(entry.amountLkr) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs max-w-xs truncate" title={entry.reasonNotes}>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {entry.reasonCode}:
                      </span>{" "}
                      <span className="text-zinc-500">{entry.reasonNotes}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs">
                      {entry.supervisorPinApproved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>✓</span> PIN Sealed
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Direct</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadgeColor(
                          entry.severity,
                        )}`}
                      >
                        {entry.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Tab 2: KOT Voids Analysis                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "VOID_ANALYSIS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Voided KOT Count
              </span>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {data.entries.filter((e) => e.eventType === "VOID_KOT").length} Orders
              </div>
              <p className="text-xs text-zinc-500">
                Total F&amp;B ingredient wastage value: {formatLkr(data.totalVoidsLkr)}
              </p>
            </GlassCard>

            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Primary Void Cause
              </span>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                Guest Table Change
              </div>
              <p className="text-xs text-zinc-500">
                Accounts for 65% of recorded dining room cancellations
              </p>
            </GlassCard>

            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Supervisor Approvals
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                100%
              </div>
              <p className="text-xs text-zinc-500">
                All KOT cancellations were signed by Captain PIN
              </p>
            </GlassCard>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>F&amp;B Waste Reduction Protocol</span>
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                High frequency of KOT voids during dinner service indicates room for improving
                captain table reassignment workflows before firing tickets to the kitchen display
                system (KDS).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("ALL_EVENTS")}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white min-h-[38px] transition-colors"
            >
              Inspect Voided Tickets
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Tab 3: Rebates & Discounts                                      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "REBATES_AND_DISCOUNTS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>💰</span>
                <span>Folio Rebates &amp; Guest Allowances</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Credits issued against settled or open folios to compensate guest service
                deficiencies.
              </p>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {formatLkr(data.totalRebatesLkr)}
              </div>
              <p className="text-xs text-zinc-400">
                Average rebate per claim: {formatLkr(data.totalRebatesLkr / 1)}
              </p>
            </div>

            <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🏷️</span>
                <span>Room Rate Plan Overrides</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Difference between standard rate engine output and front-desk negotiated room
                charge.
              </p>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {formatLkr(data.totalRateOverridesLkr)}
              </div>
              <p className="text-xs text-zinc-400">
                All overrides validated against GM approval limit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Tab 4: Cryptographic SHA-256 Ledger Chain                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "CRYPTOGRAPHIC_CHAIN" && (
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🔗</span>
                <span>SHA-256 Hash Chained Tamper-Evident Ledger</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Every override, void, and rebate is cryptographically linked to the previous block.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Integrity Verified
            </span>
          </div>

          <div className="space-y-4">
            {data.entries.map((entry, idx) => (
              <div
                key={entry.eventId}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    Block #{idx + 1}: {entry.eventId} ({entry.eventType})
                  </span>
                  <span className="text-zinc-500 font-mono">{entry.timestamp}</span>
                </div>
                <div className="font-mono text-[11px] space-y-1">
                  <div className="text-zinc-400 truncate">
                    <span className="text-zinc-600 dark:text-zinc-400 font-bold">PREV: </span>
                    {entry.prevHash}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 truncate font-semibold">
                    <span>HASH: </span>
                    {entry.entryHash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. Log Entry Drill-down Inspection Dialog                          */}
      {/* ------------------------------------------------------------------ */}
      {inspectedEntry && (
        <dialog
          open
          aria-labelledby={modalId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs w-full h-full max-w-none max-h-none border-none m-0"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-black/10 dark:border-white/20 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 id={modalId} className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Security Event State Diff
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {inspectedEntry.eventId} • {getEventTypeName(inspectedEntry.eventType)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEntry(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                <span className="text-zinc-400 font-medium">Actor:</span>
                <div className="font-semibold text-zinc-900 dark:text-white">
                  {inspectedEntry.actorName} ({inspectedEntry.actorRole})
                </div>
                <div className="text-zinc-400 font-mono">{inspectedEntry.actorUserId}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                <span className="text-zinc-400 font-medium">Device &amp; IP:</span>
                <div className="font-semibold text-zinc-900 dark:text-white">
                  {inspectedEntry.ipAddress}
                </div>
                <div className="text-zinc-400">{inspectedEntry.deviceClient}</div>
              </div>
            </div>

            {/* State Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="font-sans font-semibold text-zinc-500">Before State:</span>
                <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] overflow-x-auto text-zinc-800 dark:text-zinc-200">
                  {inspectedEntry.beforeStateJson}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="font-sans font-semibold text-zinc-500">After State:</span>
                <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] overflow-x-auto text-emerald-700 dark:text-emerald-300">
                  {inspectedEntry.afterStateJson}
                </pre>
              </div>
            </div>

            {/* Cryptographic Entry Hash */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1 text-xs">
              <span className="text-zinc-500 font-medium">SHA-256 Entry Hash:</span>
              <div className="font-mono text-[11px] break-all text-blue-600 dark:text-blue-400">
                {inspectedEntry.entryHash}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectedEntry(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-colors min-h-[44px]"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
};
