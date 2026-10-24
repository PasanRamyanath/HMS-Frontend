import { type FormEvent, useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Data Types
// ============================================================================

export type TaxPresetId = "LUXURY_VAT" | "SMALL_GUESTHOUSE" | "MICRO_TIER" | "CUSTOM";

export interface TaxSettingsData {
 readonly sltdaRegNo: string;
 readonly tinNo: string;
 readonly vatRegNo: string;
 readonly isVatRegistered: boolean;
 readonly preset: TaxPresetId;
 readonly enableSC: boolean;
 readonly scRatePercent: number;
 readonly enableTDL: boolean;
 readonly tdlRatePercent: number;
 readonly enableSSCL: boolean;
 readonly ssclRatePercent: number;
 readonly enableVAT: boolean;
 readonly vatRatePercent: number;
}

export interface TaxBreakdownCalculation {
 readonly baseLkr: number;
 readonly scLkr: number;
 readonly subtotalAfterScLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatBaseLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
 readonly effectiveRatePercent: number;
}

export interface TaxSettingsFormProps {
 readonly initialData?: Partial<TaxSettingsData> | undefined;
 readonly sampleBaseLkr?: number | undefined;
 readonly onSave?: ((data: TaxSettingsData) => Promise<void> | void) | undefined;
 readonly onCancel?: (() => void) | undefined;
 readonly isSaving?: boolean | undefined;
}

export const TAX_PRESET_OPTIONS: ReadonlyArray<SegmentedControlOption<TaxPresetId>> = [
 { id: "LUXURY_VAT", label: "Luxury VAT Hotel (34.34%)" },
 { id: "SMALL_GUESTHOUSE", label: "Guest House (1% TDL)" },
 { id: "MICRO_TIER", label: "Micro Tier (0.5% TDL)" },
 { id: "CUSTOM", label: "Custom" },
];

export const DEFAULT_TAX_SETTINGS: TaxSettingsData = {
 sltdaRegNo: "SLTDA/SQA/HOT/00482",
 tinNo: "109845672",
 vatRegNo: "109845672-7000",
 isVatRegistered: true,
 preset: "LUXURY_VAT",
 enableSC: true,
 scRatePercent: 10.0,
 enableTDL: true,
 tdlRatePercent: 1.0,
 enableSSCL: true,
 ssclRatePercent: 2.5,
 enableVAT: true,
 vatRatePercent: 18.0,
};

// ============================================================================
// 4-Stage Compounding Mathematics (IRD & SLTDA Compliance)
// ============================================================================

export function roundCents(amount: number): number {
 return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function computeSriLankanTaxBreakdown(
 baseLkr: number,
 config: Pick<
 TaxSettingsData,
 | "enableSC"
 | "scRatePercent"
 | "enableTDL"
 | "tdlRatePercent"
 | "enableSSCL"
 | "ssclRatePercent"
 | "enableVAT"
 | "vatRatePercent"
 >,
): TaxBreakdownCalculation {
 const safeBase = Math.max(0, baseLkr);

 // Stage 1: Service Charge (10% standard, staff pool)
 const scLkr = config.enableSC ? roundCents(safeBase * (config.scRatePercent / 100)) : 0;
 const subtotalAfterScLkr = safeBase + scLkr;

 // Stage 2: Tourism Development Levy (TDL on post-SC subtotal)
 const tdlLkr = config.enableTDL
 ? roundCents(subtotalAfterScLkr * (config.tdlRatePercent / 100))
 : 0;

 // Stage 3: Social Security Contribution Levy (SSCL on post-SC subtotal)
 const ssclLkr = config.enableSSCL
 ? roundCents(subtotalAfterScLkr * (config.ssclRatePercent / 100))
 : 0;

 // Stage 4: VAT Base = post-SC subtotal + TDL + SSCL
 const vatBaseLkr = subtotalAfterScLkr + tdlLkr + ssclLkr;
 const vatLkr = config.enableVAT ? roundCents(vatBaseLkr * (config.vatRatePercent / 100)) : 0;

 const grandTotalLkr = subtotalAfterScLkr + tdlLkr + ssclLkr + vatLkr;
 const effectiveRatePercent =
 safeBase > 0 ? roundCents(((grandTotalLkr - safeBase) / safeBase) * 100) : 0;

 return {
 baseLkr: safeBase,
 scLkr,
 subtotalAfterScLkr,
 tdlLkr,
 ssclLkr,
 vatBaseLkr,
 vatLkr,
 grandTotalLkr,
 effectiveRatePercent,
 };
}

export function validateTaxSettings(data: TaxSettingsData): Record<string, string> {
 const errors: Record<string, string> = {};

 if (!data.sltdaRegNo.trim()) {
 errors.sltdaRegNo = "SLTDA Registration Number is required for legal operation.";
 }

 const cleanTin = data.tinNo.replace(/\D/g, "");
 if (!cleanTin || cleanTin.length !== 9) {
 errors.tinNo = "TIN must be exactly 9 digits assigned by Inland Revenue.";
 }

 if (data.enableVAT && !data.vatRegNo.trim()) {
 errors.vatRegNo = "VAT Registration Number is required when VAT is enabled.";
 }

 return errors;
}

// ============================================================================
// Component
// ============================================================================

export function TaxSettingsForm({
 initialData,
 sampleBaseLkr = 75000,
 onSave,
 onCancel,
 isSaving = false,
}: TaxSettingsFormProps) {
 const formId = useId();

 const [formData, setFormData] = useState<TaxSettingsData>(() => ({
 ...DEFAULT_TAX_SETTINGS,
 ...initialData,
 }));

 const [errors, setErrors] = useState<Record<string, string>>({});
 const [saveSuccess, setSaveSuccess] = useState(false);

 // Live 4-stage tax compounding preview
 const breakdown = computeSriLankanTaxBreakdown(sampleBaseLkr, formData);

 const handlePresetSelect = (preset: TaxPresetId) => {
 switch (preset) {
 case "LUXURY_VAT":
 setFormData((prev) => ({
 ...prev,
 preset: "LUXURY_VAT",
 enableSC: true,
 scRatePercent: 10.0,
 enableTDL: true,
 tdlRatePercent: 1.0,
 enableSSCL: true,
 ssclRatePercent: 2.5,
 enableVAT: true,
 vatRatePercent: 18.0,
 isVatRegistered: true,
 }));
 break;
 case "SMALL_GUESTHOUSE":
 setFormData((prev) => ({
 ...prev,
 preset: "SMALL_GUESTHOUSE",
 enableSC: true,
 scRatePercent: 10.0,
 enableTDL: true,
 tdlRatePercent: 1.0,
 enableSSCL: false,
 enableVAT: false,
 isVatRegistered: false,
 }));
 break;
 case "MICRO_TIER":
 setFormData((prev) => ({
 ...prev,
 preset: "MICRO_TIER",
 enableSC: true,
 scRatePercent: 10.0,
 enableTDL: true,
 tdlRatePercent: 0.5,
 enableSSCL: false,
 enableVAT: false,
 isVatRegistered: false,
 }));
 break;
 case "CUSTOM":
 setFormData((prev) => ({ ...prev, preset: "CUSTOM" }));
 break;
 }
 };

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setSaveSuccess(false);

 const form = new FormData(event.currentTarget);
 const resolvedData: TaxSettingsData = {
 ...formData,
 sltdaRegNo: ((form.get("sltdaRegNo") as string | null) ?? formData.sltdaRegNo).trim(),
 tinNo: ((form.get("tinNo") as string | null) ?? formData.tinNo).trim(),
 vatRegNo: ((form.get("vatRegNo") as string | null) ?? formData.vatRegNo).trim(),
 };

 const validationErrors = validateTaxSettings(resolvedData);
 if (Object.keys(validationErrors).length > 0) {
 setErrors(validationErrors);
 return;
 }

 setErrors({});
 if (onSave) {
 await onSave(resolvedData);
 setSaveSuccess(true);
 }
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto font-sf-pro">
 {/* Title */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
 Sri Lankan Statutory Tax & SLTDA Configurator
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Configure 4-stage compounding statutory taxes (SC → TDL → SSCL → VAT) with live invoice
 preview.
 </p>
 </div>

 {saveSuccess && (
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 ">
 <svg
 className="w-3.5 h-3.5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2.5}
 d="M5 13l4 4L19 7"
 />
 </svg>
 Tax Configuration Saved
 </span>
 )}
 </div>

 {/* Section 1: Statutory Registration Identifiers */}
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Official Government Registrations
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label
 htmlFor={`${formId}-sltdaRegNo`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 SLTDA Registration Number *
 </label>
 <input
 id={`${formId}-sltdaRegNo`}
 name="sltdaRegNo"
 type="text"
 required
 value={formData.sltdaRegNo}
 onChange={(e) => setFormData((p) => ({ ...p, sltdaRegNo: e.target.value }))}
 placeholder="SLTDA/SQA/HOT/00482"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.sltdaRegNo && <p className="text-xs text-rose-500 mt-1">{errors.sltdaRegNo}</p>}
 </div>

 <div>
 <label
 htmlFor={`${formId}-tinNo`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 IRD Tax Identification (TIN) *
 </label>
 <input
 id={`${formId}-tinNo`}
 name="tinNo"
 type="text"
 required
 maxLength={9}
 value={formData.tinNo}
 onChange={(e) => setFormData((p) => ({ ...p, tinNo: e.target.value }))}
 placeholder="9-digit TIN (e.g. 109845672)"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring tabular-nums-lkr"
 />
 {errors.tinNo && <p className="text-xs text-rose-500 mt-1">{errors.tinNo}</p>}
 </div>

 <div>
 <label
 htmlFor={`${formId}-vatRegNo`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 VAT Registration Number
 </label>
 <input
 id={`${formId}-vatRegNo`}
 name="vatRegNo"
 type="text"
 value={formData.vatRegNo}
 onChange={(e) => setFormData((p) => ({ ...p, vatRegNo: e.target.value }))}
 placeholder="109845672-7000"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring tabular-nums-lkr"
 />
 {errors.vatRegNo && <p className="text-xs text-rose-500 mt-1">{errors.vatRegNo}</p>}
 </div>
 </div>
 </GlassCard>

 {/* Section 2: Statutory Preset Selector */}
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Statutory Tax Preset
 </h3>
 <SegmentedControl
 options={TAX_PRESET_OPTIONS}
 value={formData.preset}
 onChange={handlePresetSelect}
 fullWidth
 ariaLabel="Tax Category Preset"
 />
 </GlassCard>

 {/* Section 3: 4-Stage Toggles & Live Rs 75,000 Invoice Preview */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Toggles */}
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Compounding Stages Configuration
 </h3>

 <div className="space-y-4">
 {/* Stage 1: SC */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 ">
 <div>
 <span className="font-semibold text-xs text-slate-900 block">
 Stage 1: 10% Service Charge (SC)
 </span>
 <span className="text-[11px] text-slate-500 ">
 Shop & Office Employees Act distributed to staff pool
 </span>
 </div>
 <input
 type="checkbox"
 checked={formData.enableSC}
 onChange={(e) =>
 setFormData((p) => ({
 ...p,
 enableSC: e.target.checked,
 preset: "CUSTOM",
 }))
 }
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {/* Stage 2: TDL */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 ">
 <div>
 <span className="font-semibold text-xs text-slate-900 block">
 Stage 2: Tourism Development Levy (TDL)
 </span>
 <span className="text-[11px] text-slate-500 ">
 Tourism Act No. 38 (1.0% Hotel / 0.5% Guest House)
 </span>
 </div>
 <input
 type="checkbox"
 checked={formData.enableTDL}
 onChange={(e) =>
 setFormData((p) => ({
 ...p,
 enableTDL: e.target.checked,
 preset: "CUSTOM",
 }))
 }
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {/* Stage 3: SSCL */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 ">
 <div>
 <span className="font-semibold text-xs text-slate-900 block">
 Stage 3: 2.5% Social Security Levy (SSCL)
 </span>
 <span className="text-[11px] text-slate-500 ">
 SSCL Act No. 25 of 2022 on post-SC subtotal
 </span>
 </div>
 <input
 type="checkbox"
 checked={formData.enableSSCL}
 onChange={(e) =>
 setFormData((p) => ({
 ...p,
 enableSSCL: e.target.checked,
 preset: "CUSTOM",
 }))
 }
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {/* Stage 4: VAT */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 ">
 <div>
 <span className="font-semibold text-xs text-slate-900 block">
 Stage 4: 18% Value Added Tax (VAT)
 </span>
 <span className="text-[11px] text-slate-500 ">
 VAT Act No. 14 of 2002 on (Post-SC + TDL + SSCL)
 </span>
 </div>
 <input
 type="checkbox"
 checked={formData.enableVAT}
 onChange={(e) =>
 setFormData((p) => ({
 ...p,
 enableVAT: e.target.checked,
 preset: "CUSTOM",
 }))
 }
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>
 </div>
 </GlassCard>

 {/* Live Rs 75,000 Invoice Preview */}
 <GlassCard material="regular" radius="lg" className="p-6 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 ">
 <div>
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Live Statutory Folio Preview
 </h3>
 <span className="text-xs text-slate-500 ">
 Sample bill computed from Base Supply
 </span>
 </div>

 <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0B6E4F]/10 text-[#0B6E4F] tabular-nums-lkr">
 +{breakdown.effectiveRatePercent}% Total Loading
 </span>
 </div>

 {/* Itemized math */}
 <div className="space-y-2 mt-4 text-xs">
 <div className="flex justify-between text-slate-600 ">
 <span>Base Supply (Room / F&B Bill)</span>
 <span className="font-semibold tabular-nums-lkr">
 {formatLkr(breakdown.baseLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-600 ">
 <span>+ 10% Service Charge (SC)</span>
 <span className="font-semibold tabular-nums-lkr">{formatLkr(breakdown.scLkr)}</span>
 </div>

 <div className="flex justify-between text-slate-500 pt-1 border-t border-dashed border-slate-200 ">
 <span>Subtotal after SC</span>
 <span className="font-semibold tabular-nums-lkr">
 {formatLkr(breakdown.subtotalAfterScLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-600 ">
 <span>+ {formData.tdlRatePercent}% Tourism Levy (TDL)</span>
 <span className="font-semibold tabular-nums-lkr">
 {formatLkr(breakdown.tdlLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-600 ">
 <span>+ 2.5% Social Security Levy (SSCL)</span>
 <span className="font-semibold tabular-nums-lkr">
 {formatLkr(breakdown.ssclLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-600 ">
 <span>+ 18% Value Added Tax (VAT)</span>
 <span className="font-semibold tabular-nums-lkr">
 {formatLkr(breakdown.vatLkr)}
 </span>
 </div>
 </div>
 </div>

 <div className="pt-4 border-t-2 border-slate-900 mt-4 flex justify-between items-baseline">
 <span className="text-sm font-bold text-slate-900 ">
 Grand Total Payable
 </span>
 <span className="text-xl font-extrabold text-[#0B6E4F] tabular-nums-lkr">
 {formatLkr(breakdown.grandTotalLkr)}
 </span>
 </div>
 </GlassCard>
 </div>

 {/* Actions */}
 <div className="flex items-center justify-end gap-3 pt-2">
 {onCancel && (
 <button
 type="button"
 onClick={onCancel}
 disabled={isSaving}
 className="min-h-[44px] px-5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-black/5 transition-apple-spring cursor-pointer"
 >
 Cancel
 </button>
 )}

 <button
 type="submit"
 disabled={isSaving}
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-sm font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-2"
 >
 {isSaving ? "Saving Configuration..." : "Save Statutory Tax Settings"}
 </button>
 </div>
 </form>
 );
}
