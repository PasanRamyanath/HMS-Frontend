import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TaxCalculationMode = "FORWARD" | "REVERSE";

export type TaxPresetId =
 | "LUXURY_VAT_HOTEL"
 | "SC_EXEMPT_VAT"
 | "BOUTIQUE_NON_VAT"
 | "SMALL_GUESTHOUSE"
 | "TAX_EXEMPT";

export interface TaxCardConfig {
 readonly enableSC: boolean;
 readonly scRate: number;
 readonly enableTDL: boolean;
 readonly tdlRate: number;
 readonly enableSSCL: boolean;
 readonly ssclRate: number;
 readonly enableVAT: boolean;
 readonly vatRate: number;
}

export interface TaxAuditWalkStage {
 readonly stageNumber: number;
 readonly code: "BASE" | "SC" | "SUBTOTAL_A" | "TDL" | "SSCL" | "VAT_BASE" | "VAT" | "GRAND_TOTAL";
 readonly name: string;
 readonly statutoryCitation: string;
 readonly rateDisplay: string;
 readonly formulaDisplay: string;
 readonly amountLkr: number;
 readonly isCumulativeSubtotal: boolean;
}

export interface TaxAuditWalkResult {
 readonly mode: TaxCalculationMode;
 readonly inputAmountLkr: number;
 readonly baseSupplyLkr: number;
 readonly serviceChargeLkr: number;
 readonly subtotalAfterScLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatBaseLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
 readonly totalTaxesAndLeviesLkr: number;
 readonly effectiveMultiplier: number;
 readonly stages: ReadonlyArray<TaxAuditWalkStage>;
}

export interface TaxBreakdownCardProps {
 readonly initialAmountLkr?: number | undefined;
 readonly initialMode?: TaxCalculationMode | undefined;
 readonly initialTaxConfig?: Partial<TaxCardConfig> | undefined;
 readonly title?: string | undefined;
 readonly subtitle?: string | undefined;
 readonly showControls?: boolean | undefined;
 readonly onAmountChange?: (amountLkr: number) => void;
 readonly className?: string | undefined;
}

// ============================================================================
// Presets & Constants
// ============================================================================

export const DEFAULT_TAX_CONFIG: TaxCardConfig = {
 enableSC: true,
 scRate: 0.1,
 enableTDL: true,
 tdlRate: 0.01,
 enableSSCL: true,
 ssclRate: 0.025,
 enableVAT: true,
 vatRate: 0.18,
};

export const TAX_PRESETS: ReadonlyArray<{
 readonly id: TaxPresetId;
 readonly label: string;
 readonly description: string;
 readonly config: TaxCardConfig;
}> = [
 {
 id: "LUXURY_VAT_HOTEL",
 label: "Luxury VAT Hotel (Standard)",
 description: "10% SC + 1% TDL + 2.5% SSCL + 18% VAT (1.34343x)",
 config: DEFAULT_TAX_CONFIG,
 },
 {
 id: "SC_EXEMPT_VAT",
 label: "SC-Exempt / Government Rate",
 description: "0% SC + 1% TDL + 2.5% SSCL + 18% VAT (1.2213x)",
 config: {
 ...DEFAULT_TAX_CONFIG,
 enableSC: false,
 scRate: 0,
 },
 },
 {
 id: "BOUTIQUE_NON_VAT",
 label: "Boutique Non-VAT (< LKR 60M)",
 description: "10% SC + 1% TDL (1.111x)",
 config: {
 enableSC: true,
 scRate: 0.1,
 enableTDL: true,
 tdlRate: 0.01,
 enableSSCL: false,
 ssclRate: 0,
 enableVAT: false,
 vatRate: 0,
 },
 },
 {
 id: "SMALL_GUESTHOUSE",
 label: "Small Guesthouse / Rest House",
 description: "0.5% TDL Concession (< LKR 12M SLTDA)",
 config: {
 enableSC: false,
 scRate: 0,
 enableTDL: true,
 tdlRate: 0.005,
 enableSSCL: false,
 ssclRate: 0,
 enableVAT: false,
 vatRate: 0,
 },
 },
 {
 id: "TAX_EXEMPT",
 label: "Diplomatic / Zero-Rated",
 description: "Tax-Exempt Concession (1.000x)",
 config: {
 enableSC: false,
 scRate: 0,
 enableTDL: false,
 tdlRate: 0,
 enableSSCL: false,
 ssclRate: 0,
 enableVAT: false,
 vatRate: 0,
 },
 },
];

export const QUICK_AMOUNT_PRESETS: ReadonlyArray<number> = [10000, 25000, 50000, 100000, 250000];

// ============================================================================
// Math & Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
 if (!Number.isFinite(val)) {
 return 0;
 }
 return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeTaxMultiplier(config: TaxCardConfig): number {
 const scFactor = config.enableSC ? 1 + config.scRate : 1;
 const leviesFactor =
 1 + (config.enableTDL ? config.tdlRate : 0) + (config.enableSSCL ? config.ssclRate : 0);
 const vatFactor = config.enableVAT ? 1 + config.vatRate : 1;
 return roundLkr(scFactor * leviesFactor * vatFactor * 100000) / 100000;
}

function buildForwardStages(baseLkr: number, config: TaxCardConfig): TaxAuditWalkResult {
 const base = roundLkr(baseLkr);
 const sc = config.enableSC ? roundLkr(base * config.scRate) : 0;
 const subtotalA = roundLkr(base + sc);
 const tdl = config.enableTDL ? roundLkr(subtotalA * config.tdlRate) : 0;
 const sscl = config.enableSSCL ? roundLkr(subtotalA * config.ssclRate) : 0;
 const vatBase = roundLkr(subtotalA + tdl + sscl);
 const vat = config.enableVAT ? roundLkr(vatBase * config.vatRate) : 0;
 const grandTotal = roundLkr(subtotalA + tdl + sscl + vat);
 const totalTaxes = roundLkr(grandTotal - base);
 const multiplier = base > 0 ? roundLkr((grandTotal / base) * 100000) / 100000 : 0;

 const stages: TaxAuditWalkStage[] = [
 {
 stageNumber: 0,
 code: "BASE",
 name: "Base Supply (B)",
 statutoryCitation: "Taxable Hospitality Supply",
 rateDisplay: "100%",
 formulaDisplay: "B",
 amountLkr: base,
 isCumulativeSubtotal: false,
 },
 {
 stageNumber: 1,
 code: "SC",
 name: "10% Service Charge (SC)",
 statutoryCitation: "Shop & Office Employees Act",
 rateDisplay: config.enableSC ? `${config.scRate * 100}%` : "0%",
 formulaDisplay: "round(B * 10%)",
 amountLkr: sc,
 isCumulativeSubtotal: false,
 },
 {
 stageNumber: 1,
 code: "SUBTOTAL_A",
 name: "Subtotal After SC (A)",
 statutoryCitation: "Assessment Base for Levies",
 rateDisplay: config.enableSC ? "110%" : "100%",
 formulaDisplay: "B + SC",
 amountLkr: subtotalA,
 isCumulativeSubtotal: true,
 },
 {
 stageNumber: 2,
 code: "TDL",
 name: "Tourism Development Levy (TDL)",
 statutoryCitation: "Tourism Act No. 38 of 2005 (SLTDA)",
 rateDisplay: config.enableTDL ? `${config.tdlRate * 100}%` : "0%",
 formulaDisplay: "round(A * 1%)",
 amountLkr: tdl,
 isCumulativeSubtotal: false,
 },
 {
 stageNumber: 3,
 code: "SSCL",
 name: "Social Security Contribution Levy (SSCL)",
 statutoryCitation: "SSCL Act No. 25 of 2022 (IRD)",
 rateDisplay: config.enableSSCL ? `${config.ssclRate * 100}%` : "0%",
 formulaDisplay: "round(A * 2.5%)",
 amountLkr: sscl,
 isCumulativeSubtotal: false,
 },
 {
 stageNumber: 3,
 code: "VAT_BASE",
 name: "Combined VAT Base",
 statutoryCitation: "VAT Act Section 5(1)",
 rateDisplay: "Subtotal A + TDL + SSCL",
 formulaDisplay: "A + TDL + SSCL",
 amountLkr: vatBase,
 isCumulativeSubtotal: true,
 },
 {
 stageNumber: 4,
 code: "VAT",
 name: "Value Added Tax (VAT)",
 statutoryCitation: "Value Added Tax Act No. 14 of 2002",
 rateDisplay: config.enableVAT ? `${config.vatRate * 100}%` : "0%",
 formulaDisplay: "round(VAT Base * 18%)",
 amountLkr: vat,
 isCumulativeSubtotal: false,
 },
 {
 stageNumber: 4,
 code: "GRAND_TOTAL",
 name: "Grand Total Payable (G)",
 statutoryCitation: "Final Tax Invoice Payable",
 rateDisplay: `${multiplier}x`,
 formulaDisplay: "A + TDL + SSCL + VAT",
 amountLkr: grandTotal,
 isCumulativeSubtotal: true,
 },
 ];

 return {
 mode: "FORWARD",
 inputAmountLkr: base,
 baseSupplyLkr: base,
 serviceChargeLkr: sc,
 subtotalAfterScLkr: subtotalA,
 tdlLkr: tdl,
 ssclLkr: sscl,
 vatBaseLkr: vatBase,
 vatLkr: vat,
 grandTotalLkr: grandTotal,
 totalTaxesAndLeviesLkr: totalTaxes,
 effectiveMultiplier: multiplier,
 stages,
 };
}

function buildReverseStages(grossInclusiveLkr: number, config: TaxCardConfig): TaxAuditWalkResult {
 const gross = roundLkr(grossInclusiveLkr);
 const m = computeTaxMultiplier(config);
 const base = m > 0 ? roundLkr(gross / m) : 0;

 // Compute forward walk from derived base
 const fwd = buildForwardStages(base, config);

 // Reconcile residual discrepancy to ensure exact match with inclusive gross
 const residual = roundLkr(gross - fwd.grandTotalLkr);
 const adjustedVat = config.enableVAT ? roundLkr(fwd.vatLkr + residual) : fwd.vatLkr;
 const adjustedBase = !config.enableVAT
 ? roundLkr(fwd.baseSupplyLkr + residual)
 : fwd.baseSupplyLkr;

 const totalTaxes = roundLkr(gross - adjustedBase);
 const multiplier = adjustedBase > 0 ? roundLkr((gross / adjustedBase) * 100000) / 100000 : 0;

 const stages: TaxAuditWalkStage[] = fwd.stages.map((stage) => {
 if (stage.code === "GRAND_TOTAL") {
 return { ...stage, amountLkr: gross };
 }
 if (stage.code === "VAT" && config.enableVAT) {
 return { ...stage, amountLkr: adjustedVat };
 }
 if (stage.code === "BASE" && !config.enableVAT) {
 return { ...stage, amountLkr: adjustedBase };
 }
 return stage;
 });

 return {
 mode: "REVERSE",
 inputAmountLkr: gross,
 baseSupplyLkr: adjustedBase,
 serviceChargeLkr: fwd.serviceChargeLkr,
 subtotalAfterScLkr: fwd.subtotalAfterScLkr,
 tdlLkr: fwd.tdlLkr,
 ssclLkr: fwd.ssclLkr,
 vatBaseLkr: fwd.vatBaseLkr,
 vatLkr: adjustedVat,
 grandTotalLkr: gross,
 totalTaxesAndLeviesLkr: totalTaxes,
 effectiveMultiplier: multiplier,
 stages,
 };
}

export function calculateTaxWalk(
 amountLkr: number,
 mode: TaxCalculationMode,
 config: TaxCardConfig = DEFAULT_TAX_CONFIG,
): TaxAuditWalkResult {
 if (mode === "REVERSE") {
 return buildReverseStages(amountLkr, config);
 }
 return buildForwardStages(amountLkr, config);
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ModeSelectorProps {
 readonly mode: TaxCalculationMode;
 readonly onModeChange: (m: TaxCalculationMode) => void;
 readonly multiplier: number;
}

function ModeSelector({ mode, onModeChange, multiplier }: ModeSelectorProps) {
 return (
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 ">
 <button
 type="button"
 onClick={() => onModeChange("FORWARD")}
 className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
 mode === "FORWARD"
 ? "bg-white text-blue-600 shadow-sm"
 : "text-slate-600 hover:text-slate-900"
 }`}
 >
 <span>Forward (Exclusive)</span>
 <span className="text-[10px] opacity-75">Base → Total</span>
 </button>

 <button
 type="button"
 onClick={() => onModeChange("REVERSE")}
 className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
 mode === "REVERSE"
 ? "bg-white text-blue-600 shadow-sm"
 : "text-slate-600 hover:text-slate-900"
 }`}
 >
 <span>Reverse (Inclusive)</span>
 <span className="text-[10px] opacity-75">Total → Base</span>
 </button>
 </div>

 <div className="flex items-center gap-2 self-end sm:self-auto">
 <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold tracking-tight flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
 <span>Statutory Multiplier:</span>
 <span className="text-sm font-extrabold">{multiplier.toFixed(5)}x</span>
 </span>
 </div>
 </div>
 );
}

interface AmountBarProps {
 readonly inputId: string;
 readonly amount: number;
 readonly mode: TaxCalculationMode;
 readonly onChange: (val: number) => void;
 readonly onQuickAdd: (val: number) => void;
}

function AmountBar({ inputId, amount, mode, onChange, onQuickAdd }: AmountBarProps) {
 return (
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs font-semibold text-slate-700 ">
 <label htmlFor={inputId}>
 {mode === "FORWARD"
 ? "Taxable Base Supply Amount (B)"
 : "Contracted All-Inclusive Gross Amount (G)"}
 </label>
 <div className="flex items-center gap-1">
 {QUICK_AMOUNT_PRESETS.map((amt) => (
 <button
 key={amt}
 type="button"
 onClick={() => onQuickAdd(amt)}
 className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
 >
 +{amt >= 1000 ? `${amt / 1000}k` : amt}
 </button>
 ))}
 </div>
 </div>

 <div className="relative">
 <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
 LKR
 </span>
 <input
 id={inputId}
 type="number"
 min={0}
 step={500}
 value={amount || ""}
 onChange={(e) => onChange(Math.max(0, Number.parseFloat(e.target.value) || 0))}
 className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white/70 text-base font-mono tabular-nums font-bold text-slate-900 min-h-[44px] focus:ring-2 focus:ring-blue-500 transition-all"
 placeholder="0.00"
 />
 </div>
 </div>
 );
}

interface TaxStagesTableProps {
 readonly stages: ReadonlyArray<TaxAuditWalkStage>;
}

function TaxStagesTable({ stages }: TaxStagesTableProps) {
 return (
 <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/40 ">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200/80 bg-slate-50/60 text-slate-500 uppercase text-[10px] font-semibold">
 <th className="py-2.5 px-3">Stage & Act</th>
 <th className="py-2.5 px-3">Statutory Description</th>
 <th className="py-2.5 px-3">Rate / Formula</th>
 <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {stages.map((stg) => {
 const isHighlight = stg.code === "GRAND_TOTAL" || stg.code === "BASE";
 return (
 <tr
 key={stg.code}
 className={`transition-colors ${
 stg.isCumulativeSubtotal
 ? "bg-slate-50/50 font-semibold text-slate-800 "
 : "text-slate-600 "
 } ${isHighlight ? "bg-blue-50/40 " : ""}`}
 >
 <td className="py-2.5 px-3 font-mono text-[11px]">
 <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 ">
 S{stg.stageNumber}
 </span>
 </td>
 <td className="py-2.5 px-3">
 <div className="font-semibold text-slate-900 ">{stg.name}</div>
 <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
 {stg.statutoryCitation}
 </div>
 </td>
 <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 ">
 <span>{stg.rateDisplay}</span>
 <span className="text-[10px] opacity-75 block">{stg.formulaDisplay}</span>
 </td>
 <td
 className={`py-2.5 px-3 text-right font-mono tabular-nums text-xs ${
 isHighlight
 ? "text-blue-600 font-extrabold text-sm"
 : "font-semibold"
 }`}
 >
 {formatLkr(stg.amountLkr)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 );
}

interface TaxSummaryBarProps {
 readonly baseLkr: number;
 readonly totalTaxesLkr: number;
 readonly grandTotalLkr: number;
}

function TaxSummaryBar({ baseLkr, totalTaxesLkr, grandTotalLkr }: TaxSummaryBarProps) {
 const basePct = grandTotalLkr > 0 ? Math.round((baseLkr / grandTotalLkr) * 100) : 0;
 const taxPct = 100 - basePct;

 return (
 <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-700 ">
 Statutory Revenue Split
 </span>
 <span className="text-[11px] text-slate-500">
 Base: {basePct}% • Taxes & Levies: {taxPct}%
 </span>
 </div>

 <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
 <div
 style={{ width: `${basePct}%` }}
 className="bg-blue-600 h-full transition-all duration-300"
 title={`Net Hotel Revenue: ${formatLkr(baseLkr)}`}
 />
 <div
 style={{ width: `${taxPct}%` }}
 className="bg-amber-500 h-full transition-all duration-300"
 title={`IRD & SLTDA Levies: ${formatLkr(totalTaxesLkr)}`}
 />
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs pt-1">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
 <span className="text-slate-600 ">Net Hotel Supply:</span>
 <span className="font-mono tabular-nums font-bold ml-auto">{formatLkr(baseLkr)}</span>
 </div>

 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
 <span className="text-slate-600 ">Government & Staff:</span>
 <span className="font-mono tabular-nums font-bold ml-auto">
 {formatLkr(totalTaxesLkr)}
 </span>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Main Exported Component
// ============================================================================

export function TaxBreakdownCard({
 initialAmountLkr = 100000,
 initialMode = "FORWARD",
 initialTaxConfig,
 title = "Sri Lankan Hospitality Statutory Tax Inspector",
 subtitle = "4-stage compounding audit walk (Shop & Office SC → SLTDA TDL → IRD SSCL → IRD VAT)",
 showControls = true,
 onAmountChange,
 className = "",
}: TaxBreakdownCardProps) {
 const inputId = useId();
 const [mode, setMode] = useState<TaxCalculationMode>(initialMode);
 const [amountLkr, setAmountLkr] = useState<number>(initialAmountLkr);
 const [selectedPreset, setSelectedPreset] = useState<TaxPresetId>("LUXURY_VAT_HOTEL");
 const [customConfig, setCustomConfig] = useState<TaxCardConfig>({
 ...DEFAULT_TAX_CONFIG,
 ...initialTaxConfig,
 });

 const handleModeChange = (newMode: TaxCalculationMode) => {
 setMode(newMode);
 };

 const handleAmountChange = (newAmt: number) => {
 setAmountLkr(newAmt);
 onAmountChange?.(newAmt);
 };

 const handleQuickAdd = (amt: number) => {
 const updated = amountLkr + amt;
 setAmountLkr(updated);
 onAmountChange?.(updated);
 };

 const handleSelectPreset = (presetId: TaxPresetId) => {
 setSelectedPreset(presetId);
 const found = TAX_PRESETS.find((p) => p.id === presetId);
 if (found) {
 setCustomConfig(found.config);
 }
 };

 const walkResult = useMemo(
 () => calculateTaxWalk(amountLkr, mode, customConfig),
 [amountLkr, mode, customConfig],
 );

 return (
 <GlassCard className={`p-5 sm:p-6 space-y-5 ${className}`}>
 {/* Header */}
 <div>
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-slate-900 ">{title}</h3>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase tracking-wider">
 IRD & SLTDA Certified
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
 </div>

 {/* Preset Chips */}
 {showControls && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {TAX_PRESETS.map((preset) => (
 <button
 key={preset.id}
 type="button"
 onClick={() => handleSelectPreset(preset.id)}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
 selectedPreset === preset.id
 ? "bg-blue-600 text-white shadow-sm"
 : "bg-slate-100 text-slate-700 hover:bg-slate-200"
 }`}
 >
 {preset.label}
 </button>
 ))}
 </div>
 )}

 {/* Mode Selector & Multiplier Badge */}
 <ModeSelector
 mode={mode}
 onModeChange={handleModeChange}
 multiplier={walkResult.effectiveMultiplier}
 />

 {/* Amount Input */}
 <AmountBar
 inputId={inputId}
 amount={amountLkr}
 mode={mode}
 onChange={handleAmountChange}
 onQuickAdd={handleQuickAdd}
 />

 {/* 4-Stage Audit Walk Table */}
 <TaxStagesTable stages={walkResult.stages} />

 {/* Summary Distribution Bar */}
 <TaxSummaryBar
 baseLkr={walkResult.baseSupplyLkr}
 totalTaxesLkr={walkResult.totalTaxesAndLeviesLkr}
 grandTotalLkr={walkResult.grandTotalLkr}
 />
 </GlassCard>
 );
}
