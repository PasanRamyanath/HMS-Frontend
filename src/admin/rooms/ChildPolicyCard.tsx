import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface ChildAgeTierPolicy {
 readonly infantMaxAge: number; // e.g. 5 (0-5 yrs)
 readonly infantStayCostLkr: number; // 0
 readonly infantMealDiscountPercent: number; // 100% free

 readonly childMinAge: number; // 6
 readonly childMaxAge: number; // 11 (6-11 yrs)
 readonly childStayCostLkr: number; // 0 (free in existing bed)
 readonly childMealDiscountPercent: number; // 50% off meal plan

 readonly teenAdultMinAge: number; // 12+ yrs
}

export interface ExtraBedPolicy {
 readonly extraBedLkrPerNight: number; // e.g. 7500
 readonly extraBedUsdPerNight: number; // e.g. 25
 readonly babyCotLkrPerNight: number; // e.g. 0 (Complimentary)
 readonly babyCotUsdPerNight: number; // e.g. 0
 readonly maxExtraBedsPerRoom: number; // e.g. 1
 readonly maxBabyCotsPerRoom: number; // e.g. 1
}

export interface ChildPolicySettings {
 readonly tiers: ChildAgeTierPolicy;
 readonly extraBeds: ExtraBedPolicy;
 readonly notes?: string | undefined;
}

export interface ChildPolicyCardProps {
 readonly initialSettings?: ChildPolicySettings | undefined;
 readonly onSave?: ((settings: ChildPolicySettings) => Promise<void> | void) | undefined;
 readonly isSaving?: boolean | undefined;
 readonly readOnly?: boolean | undefined;
}

// ============================================================================
// Default Hospitality Presets (Standard Sri Lankan Resort Standard)
// ============================================================================

export const DEFAULT_CHILD_POLICY_SETTINGS: ChildPolicySettings = {
 tiers: {
 infantMaxAge: 5, // 0-5 yrs: Free stay + Free meals
 infantStayCostLkr: 0,
 infantMealDiscountPercent: 100,

 childMinAge: 6, // 6-11 yrs: Free in parent bed + 50% meals
 childMaxAge: 11,
 childStayCostLkr: 0,
 childMealDiscountPercent: 50,

 teenAdultMinAge: 12, // 12+ yrs: Full adult rate
 },
 extraBeds: {
 extraBedLkrPerNight: 7500,
 extraBedUsdPerNight: 25,
 babyCotLkrPerNight: 0,
 babyCotUsdPerNight: 0,
 maxExtraBedsPerRoom: 1,
 maxBabyCotsPerRoom: 1,
 },
 notes:
 "Infants aged 0-5 stay and dine complimentary in existing bedding. Children aged 6-11 receive 50% discount on Bed & Breakfast, Half Board, and Full Board meal supplements. Extra beds chargeable at standard nightly tariffs.",
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function validateChildPolicy(settings: ChildPolicySettings): {
 isValid: boolean;
 error?: string;
} {
 const { tiers, extraBeds } = settings;

 if (tiers.infantMaxAge < 0 || tiers.infantMaxAge > 10) {
 return { isValid: false, error: "Infant max age must be between 0 and 10." };
 }

 if (tiers.childMinAge <= tiers.infantMaxAge) {
 return {
 isValid: false,
 error: "Junior child min age must exceed infant max age.",
 };
 }

 if (tiers.childMaxAge < tiers.childMinAge) {
 return {
 isValid: false,
 error: "Junior child max age must be greater than or equal to child min age.",
 };
 }

 if (tiers.teenAdultMinAge <= tiers.childMaxAge) {
 return {
 isValid: false,
 error: "Teen/Adult min age must exceed child max age.",
 };
 }

 if (tiers.childMealDiscountPercent < 0 || tiers.childMealDiscountPercent > 100) {
 return {
 isValid: false,
 error: "Child meal discount percent must be between 0% and 100%.",
 };
 }

 if (extraBeds.extraBedLkrPerNight < 0 || extraBeds.extraBedUsdPerNight < 0) {
 return { isValid: false, error: "Extra bed rates cannot be negative." };
 }

 if (extraBeds.babyCotLkrPerNight < 0 || extraBeds.babyCotUsdPerNight < 0) {
 return { isValid: false, error: "Baby cot rates cannot be negative." };
 }

 return { isValid: true };
}

export type ChildCategory = "INFANT" | "CHILD" | "ADULT";

export function getChildCategory(age: number, tiers: ChildAgeTierPolicy): ChildCategory {
 if (age <= tiers.infantMaxAge) return "INFANT";
 if (age <= tiers.childMaxAge) return "CHILD";
 return "ADULT";
}

export interface ChildSupplementCalculation {
 readonly category: ChildCategory;
 readonly categoryLabel: string;
 readonly stayCost: number;
 readonly mealCost: number;
 readonly totalCost: number;
}

export function calculateChildSupplement(
 age: number,
 mealPlanRate: number,
 adultRoomRate: number,
 tiers: ChildAgeTierPolicy,
 currency: "LKR" | "USD",
): ChildSupplementCalculation {
 const category = getChildCategory(age, tiers);

 if (category === "INFANT") {
 return {
 category: "INFANT",
 categoryLabel: `Infant (0–${tiers.infantMaxAge} yrs)`,
 stayCost: 0,
 mealCost: 0,
 totalCost: 0,
 };
 }

 if (category === "CHILD") {
 const mealDiscount = tiers.childMealDiscountPercent / 100;
 const effectiveMeal = mealPlanRate * (1 - mealDiscount);
 const roundedMeal =
 currency === "LKR" ? Math.round(effectiveMeal) : Math.round(effectiveMeal * 100) / 100;
 const stayCost = tiers.childStayCostLkr;

 return {
 category: "CHILD",
 categoryLabel: `Junior Child (${tiers.childMinAge}–${tiers.childMaxAge} yrs)`,
 stayCost,
 mealCost: roundedMeal,
 totalCost: stayCost + roundedMeal,
 };
 }

 // Adult tier
 return {
 category: "ADULT",
 categoryLabel: `Teen / Adult (${tiers.teenAdultMinAge}+ yrs)`,
 stayCost: adultRoomRate,
 mealCost: mealPlanRate,
 totalCost: adultRoomRate + mealPlanRate,
 };
}

export function calculateExtraBedsCost(
 extraBedsCount: number,
 babyCotsCount: number,
 policy: ExtraBedPolicy,
 currency: "LKR" | "USD",
 nights = 1,
): number {
 const bedRate = currency === "LKR" ? policy.extraBedLkrPerNight : policy.extraBedUsdPerNight;
 const cotRate = currency === "LKR" ? policy.babyCotLkrPerNight : policy.babyCotUsdPerNight;

 const total = (extraBedsCount * bedRate + babyCotsCount * cotRate) * nights;
 return currency === "LKR" ? Math.round(total) : Math.round(total * 100) / 100;
}

// ============================================================================
// Subcomponent: Live Child Supplement Simulator
// ============================================================================

interface ChildPolicySimulatorProps {
 readonly settings: ChildPolicySettings;
}

function ChildPolicySimulator({ settings }: ChildPolicySimulatorProps) {
 const [currency, setCurrency] = useState<"LKR" | "USD">("LKR");
 const [adultMealSupplement, setAdultMealSupplement] = useState<number>(4500);
 const [adultRoomRate, setAdultRoomRate] = useState<number>(35000);
 const [testAges, setTestAges] = useState<ReadonlyArray<number>>([3, 8]);
 const [extraBeds, setExtraBeds] = useState<number>(1);
 const [babyCots, setBabyCots] = useState<number>(0);

 const currencyOptions: ReadonlyArray<SegmentedControlOption<"LKR" | "USD">> = [
 { id: "LKR", label: "LKR" },
 { id: "USD", label: "USD" },
 ];

 const handleAgeChange = (index: number, newAge: number) => {
 setTestAges((prev) => {
 const next = [...prev];
 next[index] = Math.max(0, Math.min(18, newAge));
 return next;
 });
 };

 const handleAddChild = () => {
 if (testAges.length < 4) {
 setTestAges((prev) => [...prev, 7]);
 }
 };

 const handleRemoveChild = (index: number) => {
 setTestAges((prev) => prev.filter((_, i) => i !== index));
 };

 const childrenCalculations = testAges.map((age) =>
 calculateChildSupplement(age, adultMealSupplement, adultRoomRate, settings.tiers, currency),
 );

 const totalChildrenMeals = childrenCalculations.reduce((acc, curr) => acc + curr.mealCost, 0);
 const totalExtraBedsCost = calculateExtraBedsCost(
 extraBeds,
 babyCots,
 settings.extraBeds,
 currency,
 );
 const grandTotalSupplement = totalChildrenMeals + totalExtraBedsCost;

 return (
 <GlassCard material="regular" radius="lg" className="p-4 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 ">
 Interactive Reservation Policy Simulator
 </h4>
 <p className="text-[11px] text-slate-500 ">
 Simulate how children ages, meal plan supplements, and extra beds impact guest checkout
 quotes.
 </p>
 </div>

 <div className="w-36">
 <SegmentedControl
 options={currencyOptions}
 value={currency}
 onChange={(val) => setCurrency(val)}
 ariaLabel="Simulator Currency"
 />
 </div>
 </div>

 {/* Simulator Inputs */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
 <div>
 <label
 htmlFor="sim-adult-meal"
 className="block text-[11px] font-semibold text-slate-600 mb-1"
 >
 Adult Meal Supp. ({currency})
 </label>
 <input
 id="sim-adult-meal"
 type="number"
 value={adultMealSupplement}
 onChange={(e) => setAdultMealSupplement(Number.parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 tabular-nums-lkr min-h-[40px]"
 />
 </div>

 <div>
 <label
 htmlFor="sim-extra-beds"
 className="block text-[11px] font-semibold text-slate-600 mb-1"
 >
 Extra Beds Count
 </label>
 <input
 id="sim-extra-beds"
 type="number"
 min={0}
 max={settings.extraBeds.maxExtraBedsPerRoom}
 value={extraBeds}
 onChange={(e) => setExtraBeds(Number.parseInt(e.target.value, 10) || 0)}
 className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 tabular-nums-lkr min-h-[40px]"
 />
 </div>

 <div>
 <label
 htmlFor="sim-baby-cots"
 className="block text-[11px] font-semibold text-slate-600 mb-1"
 >
 Baby Cots Count
 </label>
 <input
 id="sim-baby-cots"
 type="number"
 min={0}
 max={settings.extraBeds.maxBabyCotsPerRoom}
 value={babyCots}
 onChange={(e) => setBabyCots(Number.parseInt(e.target.value, 10) || 0)}
 className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 tabular-nums-lkr min-h-[40px]"
 />
 </div>

 <div>
 <label
 htmlFor="sim-room-rate"
 className="block text-[11px] font-semibold text-slate-600 mb-1"
 >
 Adult Base Room ({currency})
 </label>
 <input
 id="sim-room-rate"
 type="number"
 value={adultRoomRate}
 onChange={(e) => setAdultRoomRate(Number.parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 tabular-nums-lkr min-h-[40px]"
 />
 </div>
 </div>

 {/* Children Age Row & Calculations */}
 <div className="space-y-2 pt-2 border-t border-slate-200/60 ">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-700 ">
 Children Ages in Party ({testAges.length})
 </span>
 {testAges.length < 4 && (
 <button
 type="button"
 onClick={handleAddChild}
 className="text-xs text-[#0B6E4F] font-semibold hover:underline cursor-pointer"
 >
 + Add Child
 </button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
 {childrenCalculations.map((calc, idx) => (
 <div
 key={`calc-${idx}-${testAges[idx]}`}
 className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5 text-xs"
 >
 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-800 ">
 Child #{idx + 1}
 </span>
 <button
 type="button"
 onClick={() => handleRemoveChild(idx)}
 className="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer"
 aria-label={`Remove child ${idx + 1}`}
 >
 Remove
 </button>
 </div>

 <div className="flex items-center gap-2">
 <label
 htmlFor={`child-age-${idx}`}
 className="text-[11px] text-slate-500 "
 >
 Age:
 </label>
 <input
 id={`child-age-${idx}`}
 type="number"
 min={0}
 max={17}
 value={testAges[idx] ?? 0}
 onChange={(e) => handleAgeChange(idx, Number.parseInt(e.target.value, 10) || 0)}
 className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr font-mono"
 />
 <StatusBadge
 status={calc.category}
 label={calc.category}
 color={
 calc.category === "INFANT"
 ? "green"
 : calc.category === "CHILD"
 ? "blue"
 : "amber"
 }
 size="sm"
 />
 </div>

 <div className="pt-1 border-t border-slate-200/40 text-[11px] space-y-0.5 text-slate-600 ">
 <div className="flex justify-between">
 <span>Stay:</span>
 <span className="font-medium">
 {calc.stayCost === 0 ? "Complimentary" : `${calc.stayCost}`}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Meal Plan:</span>
 <span className="font-medium tabular-nums-lkr">
 {currency === "LKR"
 ? formatLkr(calc.mealCost)
 : `$${calc.mealCost.toFixed(2)} USD`}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Summary Footer */}
 <div className="p-3.5 rounded-xl bg-[#0B6E4F]/5 border border-apple-blue/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div className="text-xs text-slate-700 ">
 <span>Extra Beds ({extraBeds}): </span>
 <strong className="tabular-nums-lkr">
 {currency === "LKR"
 ? formatLkr(extraBeds * settings.extraBeds.extraBedLkrPerNight)
 : `$${(extraBeds * settings.extraBeds.extraBedUsdPerNight).toFixed(2)} USD`}
 </strong>
 {babyCots > 0 && (
 <span className="ml-2">
 | Baby Cots ({babyCots}):{" "}
 <strong>
 {settings.extraBeds.babyCotLkrPerNight === 0
 ? "Free"
 : `${settings.extraBeds.babyCotLkrPerNight}`}
 </strong>
 </span>
 )}
 </div>

 <div className="text-right">
 <span className="text-[11px] uppercase tracking-wider text-slate-500 block font-semibold">
 Total Child &amp; Extra Bed Supplement
 </span>
 <span className="text-base font-bold text-[#0B6E4F] tabular-nums-lkr font-mono">
 {currency === "LKR"
 ? formatLkr(grandTotalSupplement)
 : `$${grandTotalSupplement.toFixed(2)} USD`}
 </span>
 </div>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Main Component: ChildPolicyCard
// ============================================================================

export function ChildPolicyCard({
 initialSettings,
 onSave,
 isSaving = false,
 readOnly = false,
}: ChildPolicyCardProps) {
 const [settings, setSettings] = useState<ChildPolicySettings>(
 () => initialSettings ?? DEFAULT_CHILD_POLICY_SETTINGS,
 );
 const [saveSuccess, setSaveSuccess] = useState(false);
 const [validationError, setValidationError] = useState<string | null>(null);

 const handleUpdateTier = <K extends keyof ChildAgeTierPolicy>(
 key: K,
 val: ChildAgeTierPolicy[K],
 ) => {
 setSettings((prev) => ({
 ...prev,
 tiers: {
 ...prev.tiers,
 [key]: val,
 },
 }));
 };

 const handleUpdateExtraBed = <K extends keyof ExtraBedPolicy>(key: K, val: ExtraBedPolicy[K]) => {
 setSettings((prev) => ({
 ...prev,
 extraBeds: {
 ...prev.extraBeds,
 [key]: val,
 },
 }));
 };

 const handleResetDefaults = () => {
 setSettings(DEFAULT_CHILD_POLICY_SETTINGS);
 setValidationError(null);
 };

 const handleSave = async () => {
 setSaveSuccess(false);
 const validation = validateChildPolicy(settings);
 if (!validation.isValid) {
 setValidationError(validation.error ?? "Invalid child policy settings.");
 return;
 }

 setValidationError(null);
 if (onSave) {
 await onSave(settings);
 setSaveSuccess(true);
 }
 };

 return (
 <div className="space-y-6 max-w-5xl mx-auto font-sf-pro">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
 Child Policy &amp; Extra Bed Supplement Rules
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Configure 0–5 yrs Infant Free tier, 6–11 yrs Junior Child 50% meal plan, and 12+ yrs
 Adult rate supplements with extra bed tariffs.
 </p>
 </div>

 <div className="flex items-center gap-2">
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
 Policy Saved
 </span>
 )}

 {!readOnly && (
 <>
 <button
 type="button"
 onClick={handleResetDefaults}
 className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 Reset Standard Presets
 </button>
 <button
 type="button"
 onClick={handleSave}
 disabled={isSaving}
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
 >
 {isSaving ? "Saving Policy..." : "Save Child Policy"}
 </button>
 </>
 )}
 </div>
 </div>

 {validationError && (
 <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 ">
 {validationError}
 </div>
 )}

 {/* Policy Simulator */}
 <ChildPolicySimulator settings={settings} />

 {/* Main Configuration Grid: Age Tiers & Extra Beds */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Card 1: Age Brackets & Meal Discounts */}
 <GlassCard material="regular" radius="lg" className="p-4 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Child Age Brackets &amp; Meal Discounts
 </h3>
 <p className="text-[11px] text-slate-500 ">
 Accommodation and meal supplement discounting by age bracket.
 </p>
 </div>
 <StatusBadge status="ACTIVE" label="Active" color="green" size="sm" />
 </div>

 <div className="space-y-3">
 {/* Infant Bracket */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-900 ">
 Infant Bracket (0–{settings.tiers.infantMaxAge} yrs)
 </span>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
 100% Free Stay &amp; Dine
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <label
 htmlFor="infant-max-age"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Max Infant Age
 </label>
 <input
 id="infant-max-age"
 type="number"
 min={0}
 max={8}
 disabled={readOnly}
 value={settings.tiers.infantMaxAge}
 onChange={(e) =>
 handleUpdateTier("infantMaxAge", Number.parseInt(e.target.value, 10) || 0)
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 <div>
 <span className="block text-[11px] font-medium text-slate-500 mb-1">
 Meal Plan Discount
 </span>
 <div className="px-2.5 py-1.5 rounded-lg bg-slate-200/50 text-xs font-semibold text-slate-700 min-h-[38px] flex items-center">
 100% (Complimentary)
 </div>
 </div>
 </div>
 </div>

 {/* Junior Child Bracket */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-900 ">
 Junior Child ({settings.tiers.childMinAge}–{settings.tiers.childMaxAge} yrs)
 </span>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0B6E4F]/10 text-[#0B6E4F] font-semibold">
 Free Bed + 50% Meal Plan
 </span>
 </div>

 <div className="grid grid-cols-3 gap-2 text-xs">
 <div>
 <label
 htmlFor="child-min-age"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Min Age
 </label>
 <input
 id="child-min-age"
 type="number"
 min={1}
 max={12}
 disabled={readOnly}
 value={settings.tiers.childMinAge}
 onChange={(e) =>
 handleUpdateTier("childMinAge", Number.parseInt(e.target.value, 10) || 0)
 }
 className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 <div>
 <label
 htmlFor="child-max-age"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Max Age
 </label>
 <input
 id="child-max-age"
 type="number"
 min={2}
 max={15}
 disabled={readOnly}
 value={settings.tiers.childMaxAge}
 onChange={(e) =>
 handleUpdateTier("childMaxAge", Number.parseInt(e.target.value, 10) || 0)
 }
 className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 <div>
 <label
 htmlFor="child-discount"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Meal Discount %
 </label>
 <input
 id="child-discount"
 type="number"
 min={0}
 max={100}
 disabled={readOnly}
 value={settings.tiers.childMealDiscountPercent}
 onChange={(e) =>
 handleUpdateTier(
 "childMealDiscountPercent",
 Number.parseInt(e.target.value, 10) || 0,
 )
 }
 className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 </div>
 </div>

 {/* Teen / Adult Bracket */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
 <div>
 <span className="text-xs font-semibold text-slate-900 block">
 Teen &amp; Adult Tier ({settings.tiers.teenAdultMinAge}+ yrs)
 </span>
 <span className="text-[11px] text-slate-500 ">
 Standard adult room rate &amp; full meal plan tariffs apply.
 </span>
 </div>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
 100% Adult Tariff
 </span>
 </div>
 </div>
 </GlassCard>

 {/* Card 2: Extra Beds & Baby Cot Policies */}
 <GlassCard material="regular" radius="lg" className="p-4 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Extra Bed &amp; Baby Cot Tariffs
 </h3>
 <p className="text-[11px] text-slate-500 ">
 Rollaway bed and crib supplements charged per room per night.
 </p>
 </div>
 <StatusBadge status="RATES" label="Dual-Currency" color="blue" size="sm" />
 </div>

 <div className="space-y-3">
 {/* Extra Bed Row */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-900 ">
 Rollaway / Extra Bed (per night)
 </span>
 <span className="text-[11px] text-slate-500 font-medium">
 Max: {settings.extraBeds.maxExtraBedsPerRoom} / room
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <label
 htmlFor="extra-bed-lkr"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Resident Tariff (LKR)
 </label>
 <input
 id="extra-bed-lkr"
 type="number"
 disabled={readOnly}
 value={settings.extraBeds.extraBedLkrPerNight}
 onChange={(e) =>
 handleUpdateExtraBed(
 "extraBedLkrPerNight",
 Number.parseFloat(e.target.value) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 <div>
 <label
 htmlFor="extra-bed-usd"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Foreign Tariff (USD)
 </label>
 <input
 id="extra-bed-usd"
 type="number"
 disabled={readOnly}
 value={settings.extraBeds.extraBedUsdPerNight}
 onChange={(e) =>
 handleUpdateExtraBed(
 "extraBedUsdPerNight",
 Number.parseFloat(e.target.value) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 </div>
 </div>

 {/* Baby Cot Row */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-900 ">
 Baby Cot / Crib (0–2 yrs)
 </span>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
 {settings.extraBeds.babyCotLkrPerNight === 0 ? "Complimentary" : "Charged"}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <label
 htmlFor="baby-cot-lkr"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Resident Tariff (LKR)
 </label>
 <input
 id="baby-cot-lkr"
 type="number"
 disabled={readOnly}
 value={settings.extraBeds.babyCotLkrPerNight}
 onChange={(e) =>
 handleUpdateExtraBed(
 "babyCotLkrPerNight",
 Number.parseFloat(e.target.value) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 <div>
 <label
 htmlFor="baby-cot-usd"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Foreign Tariff (USD)
 </label>
 <input
 id="baby-cot-usd"
 type="number"
 disabled={readOnly}
 value={settings.extraBeds.babyCotUsdPerNight}
 onChange={(e) =>
 handleUpdateExtraBed(
 "babyCotUsdPerNight",
 Number.parseFloat(e.target.value) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 </div>
 </div>

 {/* Room Capacity Limits */}
 <div className="grid grid-cols-2 gap-2 text-xs pt-1">
 <div>
 <label
 htmlFor="max-extra-beds"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Max Extra Beds / Room
 </label>
 <input
 id="max-extra-beds"
 type="number"
 min={0}
 max={4}
 disabled={readOnly}
 value={settings.extraBeds.maxExtraBedsPerRoom}
 onChange={(e) =>
 handleUpdateExtraBed(
 "maxExtraBedsPerRoom",
 Number.parseInt(e.target.value, 10) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>

 <div>
 <label
 htmlFor="max-baby-cots"
 className="block text-[11px] font-medium text-slate-500 mb-1"
 >
 Max Baby Cots / Room
 </label>
 <input
 id="max-baby-cots"
 type="number"
 min={0}
 max={3}
 disabled={readOnly}
 value={settings.extraBeds.maxBabyCotsPerRoom}
 onChange={(e) =>
 handleUpdateExtraBed(
 "maxBabyCotsPerRoom",
 Number.parseInt(e.target.value, 10) || 0,
 )
 }
 className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
 />
 </div>
 </div>
 </div>
 </GlassCard>
 </div>

 {/* Internal Notes / Booking Engine Policy Text */}
 <GlassCard material="regular" radius="lg" className="p-4 space-y-2">
 <label
 htmlFor="child-policy-notes"
 className="block text-xs font-bold text-slate-800 "
 >
 Guest-Facing Booking Engine Policy &amp; Terms
 </label>
 <textarea
 id="child-policy-notes"
 rows={3}
 disabled={readOnly}
 value={settings.notes ?? ""}
 onChange={(e) => setSettings((prev) => ({ ...prev, notes: e.target.value }))}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue/50"
 />
 </GlassCard>
 </div>
 );
}
