import type React from "react";
import { useMemo, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type CertificationLevel = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "AUDIT_PENDING";

export type MetricStatus = "OPTIMAL" | "COMPLIANT" | "EXCEEDING_BENCHMARK";

type SustainabilityTab =
  | "ECO_BENCHMARKS"
  | "UTILITY_LEDGER"
  | "CIRCULAR_ECONOMY"
  | "CEA_REGULATORY";

interface ResourceMetric {
  readonly name: string;
  readonly unit: string;
  readonly actualValue: number;
  readonly benchmarkValue: number;
  readonly status: MetricStatus;
  readonly totalConsumption: number;
  readonly totalUnitLabel: string;
  readonly trendVsLastMonthPercent: number;
}

interface UtilityLedgerBreakdown {
  readonly cebGridKwh: number;
  readonly solarGeneratedKwh: number;
  readonly netGridKwh: number;
  readonly solarRatioPercent: number;
  readonly waterMunicipalLiters: number;
  readonly waterRainwaterHarvestedLiters: number;
  readonly waterTotalLiters: number;
  readonly lpgCylindersKg: number;
  readonly dieselGeneratorLiters: number;
  readonly dieselRunHours: number;
  readonly totalOccupiedGuestNights: number;
  readonly totalOccupiedRoomNights: number;
  readonly averageGuestsPerRoom: number;
}

interface WasteCircularityMetrics {
  readonly organicFoodWasteKg: number;
  readonly compostedOrBiogasKg: number;
  readonly glassBottlesReusedCount: number;
  readonly plasticRecycledKg: number;
  readonly cardboardPaperRecycledKg: number;
  readonly totalWasteGeneratedKg: number;
  readonly landfillDiversionRatePercent: number;
}

interface CarbonFootprintMetrics {
  readonly scope1DirectKgCo2: number;
  readonly scope2IndirectKgCo2: number;
  readonly totalCarbonTonsCo2: number;
  readonly carbonKgPerGuestNight: number;
  readonly carbonOffsetTreesPlantedCount: number;
}

interface CeaEplComplianceStatus {
  readonly eplLicenseNo: string;
  readonly eplExpiryDate: string;
  readonly stpWastewaterBodMgL: number; // Biochemical Oxygen Demand (CEA limit <= 30 mg/L)
  readonly stpWastewaterCodMgL: number; // Chemical Oxygen Demand (CEA limit <= 250 mg/L)
  readonly stpDischargeCompliant: boolean;
  readonly acousticDaytimeDb: number; // Boundary limit <= 55 dB
  readonly acousticCompliant: boolean;
}

export interface SustainabilityReportCardData {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly ceaEplNo: string;
  readonly reportingMonth: string;
  readonly nstcCertificationLevel: CertificationLevel;
  readonly overallSustainabilityScore: number;
  readonly metrics: {
    readonly electricity: ResourceMetric;
    readonly water: ResourceMetric;
    readonly lpg: ResourceMetric;
    readonly diesel: ResourceMetric;
    readonly carbon: ResourceMetric;
    readonly wasteDiversion: ResourceMetric;
  };
  readonly ledger: UtilityLedgerBreakdown;
  readonly waste: WasteCircularityMetrics;
  readonly carbon: CarbonFootprintMetrics;
  readonly cea: CeaEplComplianceStatus;
  readonly auditSealSha256: string;
}

export interface SustainabilityReportCardProps {
  readonly initialData?: SustainabilityReportCardData;
  readonly onExportCsv?: (csv: string) => void;
}

// ============================================================================
// Formatting & Badge Helpers
// ============================================================================

export function roundMetric(val: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function getStatusBadgeClasses(status: MetricStatus): string {
  switch (status) {
    case "OPTIMAL":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "COMPLIANT":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "EXCEEDING_BENCHMARK":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  }
}

export function getCertificationBadgeClasses(level: CertificationLevel): string {
  switch (level) {
    case "PLATINUM":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold";
    case "GOLD":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold";
    case "SILVER":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600 font-bold";
    case "BRONZE":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-300 dark:border-orange-700 font-bold";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  }
}

// ============================================================================
// Default Realistic Mock Data
// ============================================================================

export const DEFAULT_SUSTAINABILITY_DATA: SustainabilityReportCardData = {
  tenantId: "TENANT#GALLE-FORT-RESORT",
  hotelName: "The Heritance Galle Fort & Resort",
  sltdaRegNo: "SLTDA/HOTEL/2026/0142",
  ceaEplNo: "CEA/EPL/SP/2026/0412",
  reportingMonth: "March 2026",
  nstcCertificationLevel: "GOLD",
  overallSustainabilityScore: 88,
  metrics: {
    electricity: {
      name: "Electricity Consumption",
      unit: "kWh / guest-night",
      actualValue: 14.8,
      benchmarkValue: 18.5,
      status: "OPTIMAL",
      totalConsumption: 29600,
      totalUnitLabel: "29,600 kWh net grid",
      trendVsLastMonthPercent: -4.2,
    },
    water: {
      name: "Fresh Water Intensity",
      unit: "Liters / guest-night",
      actualValue: 275,
      benchmarkValue: 320,
      status: "OPTIMAL",
      totalConsumption: 550000,
      totalUnitLabel: "550,000 Liters (550 m³)",
      trendVsLastMonthPercent: -2.8,
    },
    lpg: {
      name: "Kitchen Thermal LPG",
      unit: "kg / guest-night",
      actualValue: 0.68,
      benchmarkValue: 0.85,
      status: "COMPLIANT",
      totalConsumption: 1360,
      totalUnitLabel: "1,360 kg (36x 37.5kg Cylinders)",
      trendVsLastMonthPercent: 1.2,
    },
    diesel: {
      name: "Generator Backup Diesel",
      unit: "Liters / guest-night",
      actualValue: 0.22,
      benchmarkValue: 0.4,
      status: "OPTIMAL",
      totalConsumption: 440,
      totalUnitLabel: "440 Liters (18.5 run hours)",
      trendVsLastMonthPercent: -12.4,
    },
    carbon: {
      name: "Carbon Footprint Intensity",
      unit: "kg CO2e / guest-night",
      actualValue: 10.92,
      benchmarkValue: 14.0,
      status: "COMPLIANT",
      totalConsumption: 21.84,
      totalUnitLabel: "21.84 Metric Tons CO2e",
      trendVsLastMonthPercent: -5.1,
    },
    wasteDiversion: {
      name: "Landfill Waste Diversion",
      unit: "% diverted from landfill",
      actualValue: 84.5,
      benchmarkValue: 75.0,
      status: "OPTIMAL",
      totalConsumption: 8200,
      totalUnitLabel: "6,929 kg diverted of 8,200 kg total",
      trendVsLastMonthPercent: 3.5,
    },
  },
  ledger: {
    cebGridKwh: 36800,
    solarGeneratedKwh: 12400,
    netGridKwh: 24400,
    solarRatioPercent: 33.7,
    waterMunicipalLiters: 420000,
    waterRainwaterHarvestedLiters: 130000,
    waterTotalLiters: 550000,
    lpgCylindersKg: 1360,
    dieselGeneratorLiters: 440,
    dieselRunHours: 18.5,
    totalOccupiedGuestNights: 2000,
    totalOccupiedRoomNights: 842,
    averageGuestsPerRoom: 2.38,
  },
  waste: {
    organicFoodWasteKg: 4600,
    compostedOrBiogasKg: 4600,
    glassBottlesReusedCount: 8400,
    plasticRecycledKg: 780,
    cardboardPaperRecycledKg: 1549,
    totalWasteGeneratedKg: 8200,
    landfillDiversionRatePercent: 84.5,
  },
  carbon: {
    scope1DirectKgCo2: 5240, // Diesel + LPG
    scope2IndirectKgCo2: 16600, // CEB electricity (Sri Lanka grid emission factor ~0.62)
    totalCarbonTonsCo2: 21.84,
    carbonKgPerGuestNight: 10.92,
    carbonOffsetTreesPlantedCount: 145,
  },
  cea: {
    eplLicenseNo: "CEA/EPL/SP/2026/0412",
    eplExpiryDate: "2027-01-31",
    stpWastewaterBodMgL: 14.5, // CEA standard limit <= 30 mg/L
    stpWastewaterCodMgL: 98.0, // CEA standard limit <= 250 mg/L
    stpDischargeCompliant: true,
    acousticDaytimeDb: 48.2, // CEA boundary standard limit <= 55 dB
    acousticCompliant: true,
  },
  auditSealSha256: "b45a89f0183e29a8f4c10283ba89104b901e88371904a019b8471920e8471920",
};

// ============================================================================
// Modular CSV Exporter
// ============================================================================

function buildCsvHeader(data: SustainabilityReportCardData): string[] {
  return [
    `"SRI LANKA HOTEL MANAGEMENT SYSTEM - SUSTAINABILITY & GREEN CERTIFICATION REPORT"`,
    `"Hotel Name:","${data.hotelName.replace(/"/g, '""')}"`,
    `"SLTDA Reg No:","${data.sltdaRegNo}"`,
    `"CEA EPL License No:","${data.ceaEplNo}"`,
    `"Reporting Month:","${data.reportingMonth}"`,
    `"National Sustainable Tourism Certification (NSTC):","${data.nstcCertificationLevel}"`,
    `"Overall Sustainability Score:","${data.overallSustainabilityScore} / 100"`,
    "",
  ];
}

function buildMetricsCsv(data: SustainabilityReportCardData): string[] {
  const lines: string[] = [
    `"SECTION 1: RESOURCE CONSUMPTION PER OCCUPIED GUEST NIGHT"`,
    `"Pillar / Resource","Actual per Guest-Night","SLTDA Benchmark","Unit","Status","Total Period Volume","Trend vs Last Month"`,
  ];

  const metricList = Object.values(data.metrics);
  for (const m of metricList) {
    lines.push(
      [
        `"${m.name}"`,
        m.actualValue.toFixed(2),
        m.benchmarkValue.toFixed(2),
        `"${m.unit}"`,
        `"${m.status}"`,
        `"${m.totalUnitLabel}"`,
        `${m.trendVsLastMonthPercent > 0 ? "+" : ""}${m.trendVsLastMonthPercent.toFixed(1)}%`,
      ].join(","),
    );
  }
  lines.push("");
  return lines;
}

function buildUtilityLedgerCsv(ledger: UtilityLedgerBreakdown): string[] {
  return [
    `"SECTION 2: UTILITY LEDGER & ENERGY MIX"`,
    `"CEB Grid Electricity Consumption (kWh):","${ledger.cebGridKwh.toFixed(2)}"`,
    `"Rooftop Solar Generation (kWh):","${ledger.solarGeneratedKwh.toFixed(2)}"`,
    `"Net Grid Invoiced (kWh):","${ledger.netGridKwh.toFixed(2)}"`,
    `"Solar Clean Energy Ratio %:","${ledger.solarRatioPercent.toFixed(1)}%"`,
    `"NWSDB Municipal Water (Liters):","${ledger.waterMunicipalLiters}"`,
    `"Rainwater Harvesting (Liters):","${ledger.waterRainwaterHarvestedLiters}"`,
    `"Total Water Utilized (Liters):","${ledger.waterTotalLiters}"`,
    `"Kitchen LPG Gas (kg):","${ledger.lpgCylindersKg.toFixed(2)}"`,
    `"Generator Diesel (Liters):","${ledger.dieselGeneratorLiters.toFixed(2)}"`,
    `"Total Occupied Guest-Nights:","${ledger.totalOccupiedGuestNights}"`,
    `"Total Occupied Room-Nights:","${ledger.totalOccupiedRoomNights}"`,
    "",
  ];
}

function buildComplianceCsv(
  waste: WasteCircularityMetrics,
  carbon: CarbonFootprintMetrics,
  cea: CeaEplComplianceStatus,
  auditSeal: string,
): string[] {
  return [
    `"SECTION 3: WASTE CIRCULARITY & CARBON FOOTPRINT"`,
    `"Organic Food Waste Composted (kg):","${waste.compostedOrBiogasKg.toFixed(2)}"`,
    `"Zero-Plastic Glass Bottles Reused:","${waste.glassBottlesReusedCount}"`,
    `"Landfill Waste Diversion Rate %:","${waste.landfillDiversionRatePercent.toFixed(1)}%"`,
    `"Total Carbon Footprint (Tons CO2e):","${carbon.totalCarbonTonsCo2.toFixed(2)}"`,
    `"Carbon Intensity (kg CO2e / Guest-Night):","${carbon.carbonKgPerGuestNight.toFixed(2)}"`,
    "",
    `"SECTION 4: CENTRAL ENVIRONMENTAL AUTHORITY (CEA) EPL STATUS"`,
    `"EPL License:","${cea.eplLicenseNo}"`,
    `"STP Wastewater BOD Test (mg/L):","${cea.stpWastewaterBodMgL} (Standard <= 30 mg/L)"`,
    `"STP Wastewater COD Test (mg/L):","${cea.stpWastewaterCodMgL} (Standard <= 250 mg/L)"`,
    `"Discharge Compliance:","${cea.stpDischargeCompliant ? "COMPLIANT" : "NON_COMPLIANT"}"`,
    `"Boundary Acoustic Noise Level:","${cea.acousticDaytimeDb} dB (Standard <= 55 dB)"`,
    "",
    `"SECTION 5: CRYPTOGRAPHIC AUDIT VERIFICATION"`,
    `"Immutable Audit Seal SHA-256:","${auditSeal}"`,
  ];
}

export function generateSustainabilityReportCsv(data: SustainabilityReportCardData): string {
  const parts = [
    ...buildCsvHeader(data),
    ...buildMetricsCsv(data),
    ...buildUtilityLedgerCsv(data.ledger),
    ...buildComplianceCsv(data.waste, data.carbon, data.cea, data.auditSealSha256),
  ];
  return parts.join("\r\n");
}

export function triggerFileDownload(
  filename: string,
  content: string,
  mimeType = "text/csv;charset=utf-8;",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main View Component
// ============================================================================

export const SustainabilityReportCard: React.FC<SustainabilityReportCardProps> = ({
  initialData = DEFAULT_SUSTAINABILITY_DATA,
  onExportCsv,
}) => {
  const [data] = useState<SustainabilityReportCardData>(initialData);
  const [activeTab, setActiveTab] = useState<SustainabilityTab>("ECO_BENCHMARKS");

  const handleExportCsv = () => {
    const csv = generateSustainabilityReportCsv(data);
    const filename = `Sustainability_ReportCard_${data.reportingMonth.replace(/\s+/g, "_")}.csv`;
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

  const metricList = useMemo(() => Object.values(data.metrics), [data.metrics]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header Toolbar (Apple HIG Translucent Surface)                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              CEA &amp; SLTDA Green Sustainability Tracker
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border ${getCertificationBadgeClasses(
                data.nstcCertificationLevel,
              )}`}
            >
              <span>🏅</span>
              <span>{data.nstcCertificationLevel} CERTIFIED</span>
            </span>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{data.hotelName}</span>
            <span>•</span>
            <span>SLTDA: {data.sltdaRegNo}</span>
            <span>•</span>
            <span>CEA EPL: {data.ceaEplNo}</span>
            <span>•</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
              {data.reportingMonth}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700 transition-colors min-h-[44px]"
            title="Download sustainability ledger CSV"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700 transition-colors min-h-[44px]"
            title="Print audit certificate"
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
        {/* Overall Eco Score */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Overall Sustainability Index
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.overallSustainabilityScore}{" "}
              <span className="text-sm font-normal text-zinc-400">/ 100</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              SLTDA National Sustainable Standard
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Electricity Intensity */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Electricity Intensity
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tabular-nums-lkr text-zinc-900 dark:text-zinc-100">
              {data.metrics.electricity.actualValue}{" "}
              <span className="text-sm font-normal text-zinc-400">kWh / GN</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Target &lt;= {data.metrics.electricity.benchmarkValue} kWh (Optimal)
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Water Intensity */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Water Intensity
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tabular-nums-lkr text-zinc-900 dark:text-zinc-100">
              {data.metrics.water.actualValue}{" "}
              <span className="text-sm font-normal text-zinc-400">Liters / GN</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Target &lt;= {data.metrics.water.benchmarkValue} L (Optimal)
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Landfill Diversion Rate */}
        <GlassCard className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xs">
          <GlassCardHeader className="p-0 pb-2">
            <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Landfill Waste Diversion
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0 space-y-1">
            <div className="text-2xl font-bold tabular-nums-lkr text-blue-600 dark:text-blue-400">
              {data.waste.landfillDiversionRatePercent}%
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.waste.compostedOrBiogasKg} kg composted + recycled
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Navigation Tabs                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="inline-flex p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 max-w-full overflow-x-auto">
          {[
            { id: "ECO_BENCHMARKS", label: "Resource Intensity Benchmarks", icon: "📊" },
            { id: "UTILITY_LEDGER", label: "Utility & Energy Ledger", icon: "⚡" },
            { id: "CIRCULAR_ECONOMY", label: "Zero-Waste & Circularity", icon: "♻️" },
            { id: "CEA_REGULATORY", label: "CEA Environmental License", icon: "📋" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SustainabilityTab)}
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
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Tab 1: Resource Intensity Benchmarks                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "ECO_BENCHMARKS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricList.map((metric) => (
            <GlassCard
              key={metric.name}
              className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4"
            >
              <GlassCardHeader className="p-0 flex flex-row items-center justify-between">
                <div>
                  <GlassCardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {metric.name}
                  </GlassCardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {metric.totalUnitLabel}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                    metric.status,
                  )}`}
                >
                  {metric.status}
                </span>
              </GlassCardHeader>

              <GlassCardContent className="p-0 space-y-3">
                <div className="flex items-baseline justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-xs text-zinc-500">Actual Intensity:</span>
                  <span className="text-2xl font-bold tabular-nums-lkr text-zinc-900 dark:text-zinc-50">
                    {metric.actualValue}{" "}
                    <span className="text-xs font-normal text-zinc-400">{metric.unit}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>SLTDA Green Target:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      &lt;= {metric.benchmarkValue} {metric.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Month-on-Month Trend:</span>
                    <span
                      className={`font-semibold ${
                        metric.trendVsLastMonthPercent <= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {metric.trendVsLastMonthPercent > 0 ? "+" : ""}
                      {metric.trendVsLastMonthPercent}%
                    </span>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Tab 2: Utility & Energy Ledger                                  */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "UTILITY_LEDGER" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Electricity Mix */}
            <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Power &amp; Clean Solar Photovoltaic Generation</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">CEB Grid Power Purchased:</span>
                  <span className="tabular-nums-lkr font-semibold">
                    {data.ledger.cebGridKwh} kWh
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400">
                  <span>Rooftop Solar Generated:</span>
                  <span className="tabular-nums-lkr font-semibold">
                    +{data.ledger.solarGeneratedKwh} kWh
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800 font-bold">
                  <span>Net Invoiced Grid Units:</span>
                  <span className="tabular-nums-lkr">{data.ledger.netGridKwh} kWh</span>
                </div>
                <div className="flex justify-between py-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Clean Solar Energy Share:</span>
                  <span>{data.ledger.solarRatioPercent}% of total</span>
                </div>
              </div>
            </div>

            {/* Water Sourcing */}
            <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>💧</span>
                <span>Fresh Water Sourcing &amp; Rainwater Harvesting</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">NWSDB Municipal Mains:</span>
                  <span className="tabular-nums-lkr font-semibold">
                    {data.ledger.waterMunicipalLiters.toLocaleString()} Liters
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                  <span>Rainwater Harvesting:</span>
                  <span className="tabular-nums-lkr font-semibold">
                    +{data.ledger.waterRainwaterHarvestedLiters.toLocaleString()} Liters
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold">
                  <span>Total Water Utilized:</span>
                  <span className="tabular-nums-lkr">
                    {data.ledger.waterTotalLiters.toLocaleString()} Liters
                  </span>
                </div>
                <div className="flex justify-between py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Rainwater Substitution:</span>
                  <span>
                    {(
                      (data.ledger.waterRainwaterHarvestedLiters / data.ledger.waterTotalLiters) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Tab 3: Zero-Waste & Circular Economy                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "CIRCULAR_ECONOMY" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Glass Bottling Plant
              </span>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {data.waste.glassBottlesReusedCount.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500">
                Onsite filtered water bottles filled; eliminated single-use PET plastic entirely
              </p>
            </GlassCard>

            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Food Waste Composted
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {data.waste.compostedOrBiogasKg.toLocaleString()} kg
              </div>
              <p className="text-xs text-zinc-500">
                Converted to organic compost for hotel herb garden &amp; estate tea bushes
              </p>
            </GlassCard>

            <GlassCard className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Trees Offset Equivalent
              </span>
              <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {data.carbon.carbonOffsetTreesPlantedCount} Trees
              </div>
              <p className="text-xs text-zinc-500">
                Kanneliya Rainforest endemic tree planting initiative
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Tab 4: Central Environmental Authority (CEA) Regulatory         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "CEA_REGULATORY" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🇱🇰</span>
                  <span>
                    Central Environmental Authority (CEA) Environmental Protection License (EPL)
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  License No: {data.cea.eplLicenseNo} • Valid through {data.cea.eplExpiryDate}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                EPL Active &amp; Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                <span className="text-xs uppercase font-semibold text-zinc-500">
                  Sewage Treatment Plant (STP) Effluent BOD
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.cea.stpWastewaterBodMgL} mg/L
                </div>
                <p className="text-xs text-zinc-500">
                  CEA General Standards for Discharge: &lt;= 30.0 mg/L (Safe for garden irrigation)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                <span className="text-xs uppercase font-semibold text-zinc-500">
                  Boundary Daytime Acoustic Level
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.cea.acousticDaytimeDb} dB(A)
                </div>
                <p className="text-xs text-zinc-500">
                  National Environmental (Noise Control) Regulations: &lt;= 55.0 dB(A)
                </p>
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Seal */}
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 shadow-xs space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Immutable Audit Log SHA-256 Ledger Seal
            </h4>
            <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all bg-zinc-100 dark:bg-zinc-800/80 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
              {data.auditSealSha256}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
