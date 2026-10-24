import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import { useId, useRef, useState } from "react";
import { WebpUploadField } from "../../components/WebpUploadField.js";
import { Department, MealPlan, type TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";
import { DEFAULT_DOMSPEED_CATEGORIES } from "./CategoryManager.js";
import {
 type AdminMenuItem,
 type CategoryFilterOption,
 resolveTrilingual,
} from "./MenuItemGrid.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface AdminMenuItemSaveInput {
 readonly id?: string | undefined;
 readonly categoryId: string;
 readonly code: string;
 readonly title: TrilingualText;
 readonly description: TrilingualText;
 readonly imageUrl?: string | null | undefined;
 readonly priceLkr: number;
 readonly department: Department;
 readonly kitchenStation?: string | null | undefined;
 readonly isVegetarian: boolean;
 readonly isVegan: boolean;
 readonly isHalal: boolean;
 readonly isGlutenFree: boolean;
 readonly spicyLevel: number;
 readonly isAvailable: boolean;
 readonly prepTimeMins: number;
 readonly includedInMealPlans: ReadonlyArray<MealPlan>;
 readonly displayOrder?: number | undefined;
}

export interface MenuItemModalProps {
 readonly isOpen: boolean;
 readonly initialItem?: AdminMenuItem | null | undefined;
 readonly categories?: ReadonlyArray<CategoryFilterOption> | undefined;
 readonly defaultCategoryId?: string | undefined;
 readonly onSave: (item: AdminMenuItemSaveInput) => void;
 readonly onClose: () => void;
 readonly className?: string | undefined;
}

interface SpiceOptionConfig {
 readonly level: number;
 readonly label: string;
 readonly subtext: string;
 readonly emoji: string;
}

export const SPICE_LEVEL_OPTIONS: ReadonlyArray<SpiceOptionConfig> = [
 { level: 0, label: "Mild", subtext: "Non-spicy / European tourist friendly", emoji: "Eco" },
 { level: 1, label: "Medium", subtext: "Subtle Ceylon chili & curry warmth", emoji: "Spicy" },
 { level: 2, label: "Hot", subtext: "Spicy with roasted chili flakes", emoji: "Hot x2" },
 {
 level: 3,
 label: "Authentic SL Spicy",
 subtext: "Traditional village spice with green chilies",
 emoji: "Hot x3",
 },
];

export const MEAL_PLAN_CONFIGS: ReadonlyArray<{ readonly plan: MealPlan; readonly label: string }> =
 [
 { plan: MealPlan.Bb, label: "Bed & Breakfast (BB)" },
 { plan: MealPlan.Hb, label: "Half Board (HB)" },
 { plan: MealPlan.Fb, label: "Full Board (FB)" },
 { plan: MealPlan.Ai, label: "All Inclusive (AI)" },
 ];

interface ValidationParams {
 readonly initialItemId?: string | undefined;
 readonly displayOrder?: number | undefined;
 readonly categoryId: string;
 readonly code: string;
 readonly titleEn: string;
 readonly titleSi: string;
 readonly titleTa: string;
 readonly descEn: string;
 readonly descSi: string;
 readonly descTa: string;
 readonly imageUrl: string | null;
 readonly priceLkr: number;
 readonly department: Department;
 readonly kitchenStation: string;
 readonly isVegetarian: boolean;
 readonly isVegan: boolean;
 readonly isHalal: boolean;
 readonly isGlutenFree: boolean;
 readonly spicyLevel: number;
 readonly isAvailable: boolean;
 readonly prepTimeMins: number;
 readonly includedInMealPlans: ReadonlyArray<MealPlan>;
}

export function validateAndBuildItemPayload(
 params: ValidationParams,
):
 | { readonly valid: true; readonly payload: AdminMenuItemSaveInput }
 | { readonly valid: false; readonly error: string } {
 if (!params.titleEn.trim()) {
 return { valid: false, error: "English dish title is required" };
 }
 if (!params.code.trim()) {
 return { valid: false, error: "Dish short code (e.g. KOT-402) is required" };
 }
 if (params.priceLkr < 0) {
 return { valid: false, error: "Selling price cannot be negative" };
 }

 return {
 valid: true,
 payload: {
 id: params.initialItemId,
 categoryId: params.categoryId,
 code: params.code.trim().toUpperCase(),
 title: {
 en: params.titleEn.trim(),
 si: params.titleSi.trim() || null,
 ta: params.titleTa.trim() || null,
 },
 description: {
 en: params.descEn.trim(),
 si: params.descSi.trim() || null,
 ta: params.descTa.trim() || null,
 },
 imageUrl: params.imageUrl,
 priceLkr: params.priceLkr,
 department: params.department,
 kitchenStation: params.kitchenStation.trim() || null,
 isVegetarian: params.isVegetarian,
 isVegan: params.isVegan,
 isHalal: params.isHalal,
 isGlutenFree: params.isGlutenFree,
 spicyLevel: params.spicyLevel,
 isAvailable: params.isAvailable,
 prepTimeMins: params.prepTimeMins,
 includedInMealPlans: params.includedInMealPlans,
 displayOrder: params.displayOrder,
 },
 };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

/**
 * Trilingual text input group for dish titles and culinary descriptions.
 */
export function TrilingualDishFields({
 titleEn,
 setTitleEn,
 titleSi,
 setTitleSi,
 titleTa,
 setTitleTa,
 descEn,
 setDescEn,
 descSi,
 setDescSi,
 descTa,
 setDescTa,
}: {
 readonly titleEn: string;
 readonly setTitleEn: (v: string) => void;
 readonly titleSi: string;
 readonly setTitleSi: (v: string) => void;
 readonly titleTa: string;
 readonly setTitleTa: (v: string) => void;
 readonly descEn: string;
 readonly setDescEn: (v: string) => void;
 readonly descSi: string;
 readonly setDescSi: (v: string) => void;
 readonly descTa: string;
 readonly setDescTa: (v: string) => void;
}) {
 const [activeLangTab, setActiveLangTab] = useState<SupportedLanguage>("en");
 const fieldPrefix = useId();

 return (
 <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 ">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200 ">
 <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
 Dish Title &amp; Culinary Description (Trilingual)
 </span>

 {/* Language Tabs */}
 <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
 {(["en", "si", "ta"] as const).map((lang) => (
 <button
 key={lang}
 type="button"
 onClick={() => setActiveLangTab(lang)}
 className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${
 activeLangTab === lang
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {lang === "en" ? "English" : lang === "si" ? "සිංහල" : "தமிழ்"}
 </button>
 ))}
 </div>
 </div>

 {activeLangTab === "en" && (
 <div className="space-y-3">
 <div>
 <label
 htmlFor={`${fieldPrefix}-title-en`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 English Title <span className="text-rose-500">*</span>
 </label>
 <input
 id={`${fieldPrefix}-title-en`}
 type="text"
 required
 value={titleEn}
 onChange={(e) => setTitleEn(e.target.value)}
 placeholder="e.g. Village Style Chicken Rice & Curry"
 className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>
 <div>
 <label
 htmlFor={`${fieldPrefix}-desc-en`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 English Culinary Description
 </label>
 <textarea
 id={`${fieldPrefix}-desc-en`}
 rows={2}
 value={descEn}
 onChange={(e) => setDescEn(e.target.value)}
 placeholder="Detailed description of ingredients, spices, and sides…"
 className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
 />
 </div>
 </div>
 )}

 {activeLangTab === "si" && (
 <div className="space-y-3">
 <div>
 <label
 htmlFor={`${fieldPrefix}-title-si`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Sinhala Title (සිංහල මාතෘකාව)
 </label>
 <input
 id={`${fieldPrefix}-title-si`}
 type="text"
 value={titleSi}
 onChange={(e) => setTitleSi(e.target.value)}
 placeholder="උදා: ගමේ ක්රමයට සැකසූ කුකුළු මස් බත් සහ ව්යංජන"
 className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>
 <div>
 <label
 htmlFor={`${fieldPrefix}-desc-si`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Sinhala Description (විස්තරය)
 </label>
 <textarea
 id={`${fieldPrefix}-desc-si`}
 rows={2}
 value={descSi}
 onChange={(e) => setDescSi(e.target.value)}
 placeholder="සුවඳැති සම්බා බත්, කුළුබඩු මිශ්ර කුකුළු මස්, පරිප්පු හා පොල් සම්බෝල…"
 className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
 />
 </div>
 </div>
 )}

 {activeLangTab === "ta" && (
 <div className="space-y-3">
 <div>
 <label
 htmlFor={`${fieldPrefix}-title-ta`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Tamil Title (தமிழ் தலைப்பு)
 </label>
 <input
 id={`${fieldPrefix}-title-ta`}
 type="text"
 value={titleTa}
 onChange={(e) => setTitleTa(e.target.value)}
 placeholder="உதா: கிராமத்து முறை கோழிக்கறி அரிசி சாதம்"
 className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>
 <div>
 <label
 htmlFor={`${fieldPrefix}-desc-ta`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Tamil Description (விளக்கம்)
 </label>
 <textarea
 id={`${fieldPrefix}-desc-ta`}
 rows={2}
 value={descTa}
 onChange={(e) => setDescTa(e.target.value)}
 placeholder="சுவையான சம்பா சாதம், காரசாரமான சிக்கன் குழம்பு மற்றும் அப்பளம்…"
 className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
 />
 </div>
 </div>
 )}
 </div>
 );
}

/**
 * Operational Fields: Pricing, POS Code, Prep Time, Department, and Kitchen Station.
 */
export function OperationalDishFields({
 categories,
 categoryId,
 setCategoryId,
 code,
 setCode,
 priceLkr,
 setPriceLkr,
 prepTimeMins,
 setPrepTimeMins,
 department,
 setDepartment,
 kitchenStation,
 setKitchenStation,
}: {
 readonly categories: ReadonlyArray<CategoryFilterOption>;
 readonly categoryId: string;
 readonly setCategoryId: (v: string) => void;
 readonly code: string;
 readonly setCode: (v: string) => void;
 readonly priceLkr: number;
 readonly setPriceLkr: (v: number) => void;
 readonly prepTimeMins: number;
 readonly setPrepTimeMins: (v: number) => void;
 readonly department: Department;
 readonly setDepartment: (v: Department) => void;
 readonly kitchenStation: string;
 readonly setKitchenStation: (v: string) => void;
}) {
 const { currentLanguage } = useTranslation();
 const fieldPrefix = useId();

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {/* Category Dropdown */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-category`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Catalog Category <span className="text-rose-500">*</span>
 </label>
 <select
 id={`${fieldPrefix}-category`}
 value={categoryId}
 onChange={(e) => setCategoryId(e.target.value)}
 required
 className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px] cursor-pointer"
 >
 {categories.map((c) => (
 <option key={c.id} value={c.id}>
 {resolveTrilingual(c.name, currentLanguage)}
 </option>
 ))}
 </select>
 </div>

 {/* POS Dish Short Code */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-code`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Dish / POS Code <span className="text-rose-500">*</span>
 </label>
 <input
 id={`${fieldPrefix}-code`}
 type="text"
 required
 value={code}
 onChange={(e) => setCode(e.target.value.toUpperCase())}
 placeholder="e.g. KOT-402"
 className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>

 {/* Price in LKR */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-price`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Selling Price (LKR) <span className="text-rose-500">*</span>
 </label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">
 LKR
 </span>
 <input
 id={`${fieldPrefix}-price`}
 type="number"
 min="0"
 step="50"
 required
 value={priceLkr || ""}
 onChange={(e) => setPriceLkr(Number(e.target.value) || 0)}
 placeholder="2450.00"
 className="w-full pl-12 pr-3 py-2.5 rounded-xl text-xs font-bold tabular-nums-lkr bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>
 </div>

 {/* Preparation Time */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-prep`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Prep Time (Minutes)
 </label>
 <div className="relative">
 <input
 id={`${fieldPrefix}-prep`}
 type="number"
 min="1"
 max="180"
 value={prepTimeMins || ""}
 onChange={(e) => setPrepTimeMins(Number(e.target.value) || 0)}
 placeholder="15"
 className="w-full px-3 py-2.5 rounded-xl text-xs font-bold tabular-nums-lkr bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400">
 mins
 </span>
 </div>
 </div>

 {/* Target Department */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-dept`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Department
 </label>
 <select
 id={`${fieldPrefix}-dept`}
 value={department}
 onChange={(e) => setDepartment(e.target.value as Department)}
 className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px] cursor-pointer"
 >
 <option value={Department.Kitchen}>Kitchen</option>
 <option value={Department.Bar}>Bar</option>
 <option value={Department.Spa}>Spa</option>
 <option value={Department.Housekeeping}>Housekeeping</option>
 </select>
 </div>

 {/* Physical Kitchen Station */}
 <div>
 <label
 htmlFor={`${fieldPrefix}-station`}
 className="text-xs font-medium text-slate-700 block mb-1"
 >
 Kitchen / Service Station
 </label>
 <input
 id={`${fieldPrefix}-station`}
 type="text"
 value={kitchenStation}
 onChange={(e) => setKitchenStation(e.target.value)}
 placeholder="e.g. Hot Wok, Curry Station, Grill"
 className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 </div>
 </div>
 );
}

/**
 * Spice Level Radio Grid (0=Mild, 1=Medium, 2=Hot, 3=Authentic SL Spicy).
 */
export function SpiceLevelRadioSelector({
 spicyLevel,
 setSpicyLevel,
}: {
 readonly spicyLevel: number;
 readonly setSpicyLevel: (v: number) => void;
}) {
 return (
 <div className="space-y-2">
 <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
 Sri Lankan Spice Heat Rating
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
 {SPICE_LEVEL_OPTIONS.map((opt) => {
 const isSelected = spicyLevel === opt.level;
 return (
 <button
 key={opt.level}
 type="button"
 onClick={() => setSpicyLevel(opt.level)}
 className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-h-[64px] flex flex-col justify-between ${
 isSelected
 ? "bg-[#0B6E4F]/10 border-apple-blue shadow-sm"
 : "bg-white border-slate-200 hover:bg-slate-50 "
 }`}
 >
 <div className="flex items-center justify-between w-full">
 <span className="text-xs font-bold text-slate-900 ">
 {opt.label}
 </span>
 <span className="text-sm" aria-hidden="true">
 <DynamicTokenIcon token={opt.emoji} />
 </span>
 </div>
 <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">
 {opt.subtext}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 );
}

/**
 * Dietary Classification & In Stock Switches.
 */
export function DietaryAndStockToggles({
 isVegetarian,
 setIsVegetarian,
 isVegan,
 setIsVegan,
 isHalal,
 setIsHalal,
 isGlutenFree,
 setIsGlutenFree,
 isAvailable,
 setIsAvailable,
}: {
 readonly isVegetarian: boolean;
 readonly setIsVegetarian: (v: boolean) => void;
 readonly isVegan: boolean;
 readonly setIsVegan: (v: boolean) => void;
 readonly isHalal: boolean;
 readonly setIsHalal: (v: boolean) => void;
 readonly isGlutenFree: boolean;
 readonly setIsGlutenFree: (v: boolean) => void;
 readonly isAvailable: boolean;
 readonly setIsAvailable: (v: boolean) => void;
}) {
 return (
 <div className="space-y-3">
 <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
 Dietary Badges &amp; Floor Availability
 </span>

 <div className="flex flex-wrap items-center gap-3">
 {/* Vegetarian */}
 <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-pointer">
 <input
 type="checkbox"
 checked={isVegetarian}
 onChange={(e) => setIsVegetarian(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F] focus:ring-apple-blue"
 />
 <span className="text-xs font-medium text-slate-700 ">Vegetarian</span>
 </label>

 {/* Vegan */}
 <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-pointer">
 <input
 type="checkbox"
 checked={isVegan}
 onChange={(e) => setIsVegan(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F] focus:ring-apple-blue"
 />
 <span className="text-xs font-medium text-slate-700 ">Vegan</span>
 </label>

 {/* Halal */}
 <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-pointer">
 <input
 type="checkbox"
 checked={isHalal}
 onChange={(e) => setIsHalal(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F] focus:ring-apple-blue"
 />
 <span className="text-xs font-medium text-slate-700 ">
 Halal Sourced
 </span>
 </label>

 {/* Gluten-Free */}
 <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px] cursor-pointer">
 <input
 type="checkbox"
 checked={isGlutenFree}
 onChange={(e) => setIsGlutenFree(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F] focus:ring-apple-blue"
 />
 <span className="text-xs font-medium text-slate-700 ">
 Gluten-Free
 </span>
 </label>

 {/* In Stock vs 86'd */}
 <label
 className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border min-h-[44px] cursor-pointer ${
 isAvailable
 ? "border-emerald-500/40 bg-emerald-50/50 text-emerald-800 "
 : "border-rose-500/40 bg-rose-50/50 text-rose-800 "
 }`}
 >
 <input
 type="checkbox"
 checked={isAvailable}
 onChange={(e) => setIsAvailable(e.target.checked)}
 className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
 />
 <span className="text-xs font-bold">
 {isAvailable ? "In Stock (Available on QR)" : "86'd (Out of Stock)"}
 </span>
 </label>
 </div>
 </div>
 );
}

/**
 * Meal-Plan Inclusion Checkboxes (Complimentary buffet/entitlement rules under BB/HB/FB/AI).
 */
export function MealPlanInclusionCheckboxes({
 includedInMealPlans,
 setIncludedInMealPlans,
}: {
 readonly includedInMealPlans: ReadonlyArray<MealPlan>;
 readonly setIncludedInMealPlans: (plans: ReadonlyArray<MealPlan>) => void;
}) {
 const toggleMealPlan = (plan: MealPlan) => {
 if (includedInMealPlans.includes(plan)) {
 setIncludedInMealPlans(includedInMealPlans.filter((p) => p !== plan));
 } else {
 setIncludedInMealPlans([...includedInMealPlans, plan]);
 }
 };

 return (
 <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 ">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
 Complimentary Meal-Plan Inclusions
 </span>
 <span className="text-[10px] text-slate-500">
 Guests on selected board stay free for this dish
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
 {MEAL_PLAN_CONFIGS.map(({ plan, label }) => {
 const isChecked = includedInMealPlans.includes(plan);
 return (
 <label
 key={plan}
 className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition min-h-[44px] ${
 isChecked
 ? "bg-[#0B6E4F] text-white border-apple-blue shadow-sm"
 : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 "
 }`}
 >
 <input
 type="checkbox"
 checked={isChecked}
 onChange={() => toggleMealPlan(plan)}
 className="w-4 h-4 rounded text-[#0B6E4F] focus:ring-apple-blue"
 />
 <span className="truncate">{label}</span>
 </label>
 );
 })}
 </div>
 </div>
 );
}

/**
 * Modal Header Bar.
 */
export function ModalHeader({
 isEditing,
 dialogId,
 onClose,
}: {
 readonly isEditing: boolean;
 readonly dialogId: string;
 readonly onClose: () => void;
}) {
 return (
 <div className="flex items-center justify-between pb-4 border-b border-slate-200 ">
 <div>
 <div className="flex items-center gap-2">
 <h2 id={`${dialogId}-title`} className="text-lg font-bold text-slate-900 ">
 {isEditing ? "Edit Menu Dish" : "Create New Menu Item"}
 </h2>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B6E4F]/15 text-[#0B6E4F]">
 DOMSpeed Rung 2
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-0.5">
 1:1 WebP upload, Sri Lankan spice levels, trilingual titles, and meal-plan allowances
 </p>
 </div>

 <button
 type="button"
 onClick={onClose}
 aria-label="Close modal"
 className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer min-h-[44px] min-w-[44px]"
 >
 x
 </button>
 </div>
 );
}

/**
 * Modal Footer Action Buttons.
 */
export function ModalFooterActions({
 isEditing,
 onClose,
}: {
 readonly isEditing: boolean;
 readonly onClose: () => void;
}) {
 return (
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition min-h-[44px] cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0B6E4F] hover:bg-blue-600 text-white shadow-md transition min-h-[44px] cursor-pointer"
 >
 {isEditing ? "Save Changes" : "Create Dish"}
 </button>
 </div>
 );
}

export const CURATED_DISH_PHOTOS: ReadonlyArray<{
 readonly id: string;
 readonly name: string;
 readonly url: string;
}> = [
 {
 id: "rice-curry",
 name: "Ceylon Rice & Curry",
 url: "/images/dish-jaffna-crab-hoppers.jpg",
 },
 {
 id: "egg-hoppers",
 name: "Egg Hoppers & Sambol",
 url: "/images/dish-jaffna-crab-hoppers.jpg",
 },
 {
 id: "kottu-roti",
 name: "Sri Lankan Kottu Roti",
 url: "/images/dish-cuttlefish-arrack.jpg",
 },
 {
 id: "seafood-platter",
 name: "Devilled Seafood Platter",
 url: "/images/dish-cuttlefish-arrack.jpg",
 },
 {
 id: "king-coconut",
 name: "Fresh King Coconut (Thambili)",
 url: "/images/room-deluxe-ocean.jpg",
 },
 {
 id: "ceylon-tea",
 name: "Ceylon Single-Estate Tea",
 url: "/images/spa-ayurveda-pavilion.jpg",
 },
];

function processDishImageFile(file: File, onSelect: (url: string) => void) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const dataUrl = event.target?.result as string;
 if (typeof window !== "undefined" && typeof document !== "undefined") {
 const img = new Image();
 img.onload = () => {
 try {
 const canvas = document.createElement("canvas");
 const size = Math.min(img.width, img.height);
 canvas.width = 500;
 canvas.height = 500;
 const ctx = canvas.getContext("2d");
 if (ctx) {
 const offsetX = (img.width - size) / 2;
 const offsetY = (img.height - size) / 2;
 ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 500, 500);
 const webpData = canvas.toDataURL("image/webp", 0.85);
 onSelect(webpData);
 } else {
 onSelect(dataUrl);
 }
 } catch {
 onSelect(dataUrl);
 }
 };
 img.onerror = () => onSelect(dataUrl);
 img.src = dataUrl;
 } else {
 onSelect(dataUrl);
 }
 };
 reader.readAsDataURL(file);
}

interface DishPhotoManagerProps {
 readonly currentImageUrl?: string | null | undefined;
 readonly onImageSelected: (url: string | null) => void;
}

export function DishPhotoManager({ currentImageUrl, onImageSelected }: DishPhotoManagerProps) {
 const [activeTab, setActiveTab] = useState<"UPLOAD" | "URL" | "PRESET">("UPLOAD");
 const [urlInput, setUrlInput] = useState("");
 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 processDishImageFile(file, (url) => onImageSelected(url));
 }
 };

 const handleApplyUrl = () => {
 if (urlInput.trim()) {
 onImageSelected(urlInput.trim());
 setUrlInput("");
 }
 };

 return (
 <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 ">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 ">
 <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
 Dish Photography (1:1 Square WebP, &lt; 80 KB)
 </span>
 <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
 <button
 type="button"
 onClick={() => setActiveTab("UPLOAD")}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[32px] ${
 activeTab === "UPLOAD"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 Upload
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("URL")}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[32px] ${
 activeTab === "URL"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 URL
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("PRESET")}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[32px] ${
 activeTab === "PRESET"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 SL Presets
 </button>
 </div>
 </div>

 {/* Active Photo Preview & Remove */}
 {currentImageUrl ? (
 <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 ">
 <img
 src={currentImageUrl}
 alt="Dish preview"
 className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
 />
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold text-slate-900 ">
 Active Photo Ready
 </span>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
 1:1 Ready
 </span>
 </div>
 <p className="text-[11px] text-slate-500 truncate mt-0.5">
 Optimized for QR menu, POS terminal &amp; physical print
 </p>
 </div>
 <button
 type="button"
 onClick={() => onImageSelected(null)}
 className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition border border-rose-200 cursor-pointer min-h-[36px]"
 >
 Remove
 </button>
 </div>
 ) : null}

 {/* Tab 1: File Upload */}
 {activeTab === "UPLOAD" && (
 <div className="space-y-2">
 <input
 ref={fileInputRef}
 type="file"
 accept="image/png,image/jpeg,image/webp,image/avif"
 onChange={handleFileChange}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-apple-blue bg-white/60 hover:bg-[#0B6E4F]/[0.02] transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer min-h-[90px]"
 >
 
 <div className="text-xs font-semibold text-slate-800 ">
 Choose Image from Device / Drag &amp; Drop
 </div>
 <p className="text-[11px] text-slate-500 ">
 Supports JPEG, PNG, WebP • Auto-crops to 1:1 Square (500×500)
 </p>
 </button>
 <div className="pt-1">
 <WebpUploadField
 preset="SQUARE_500"
 currentImageUrl={currentImageUrl ?? undefined}
 onUploadSuccess={(res) => onImageSelected(res.url)}
 description="High-resolution square dish presentation for Apple HIG contactless QR ordering"
 />
 </div>
 </div>
 )}

 {/* Tab 2: Image URL */}
 {activeTab === "URL" && (
 <div className="flex gap-2">
 <input
 type="url"
 value={urlInput}
 onChange={(e) => setUrlInput(e.target.value)}
 placeholder="https://images.unsplash.com/... or CDN link"
 className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]"
 />
 <button
 type="button"
 onClick={handleApplyUrl}
 disabled={!urlInput.trim()}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B6E4F] text-white disabled:opacity-50 hover:bg-[#0B6E4F]/90 cursor-pointer min-h-[44px]"
 >
 Apply URL
 </button>
 </div>
 )}

 {/* Tab 3: Curated Presets */}
 {activeTab === "PRESET" && (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {CURATED_DISH_PHOTOS.map((preset) => (
 <button
 key={preset.id}
 type="button"
 onClick={() => onImageSelected(preset.url)}
 className="p-1.5 rounded-xl border border-slate-200 hover:border-apple-blue bg-white text-left transition flex items-center gap-2 cursor-pointer group"
 >
 <img
 src={preset.url}
 alt={preset.name}
 className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200/50"
 />
 <span className="text-[11px] font-medium text-slate-800 group-hover:text-[#0B6E4F] truncate">
 {preset.name}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>
 );
}

export interface MenuItemFormState {
 titleEn: string;
 titleSi: string;
 titleTa: string;
 descEn: string;
 descSi: string;
 descTa: string;
 categoryId: string;
 code: string;
 priceLkr: number;
 prepTimeMins: number;
 department: Department;
 kitchenStation: string;
 imageUrl: string | null;
 spicyLevel: number;
 isVegetarian: boolean;
 isVegan: boolean;
 isHalal: boolean;
 isGlutenFree: boolean;
 isAvailable: boolean;
}

export function createInitialFormState(
 item: AdminMenuItem | null | undefined,
 defaultCategoryId: string | undefined,
 fallbackCategoryId: string,
): MenuItemFormState {
 if (!item) {
 return {
 titleEn: "",
 titleSi: "",
 titleTa: "",
 descEn: "",
 descSi: "",
 descTa: "",
 categoryId: defaultCategoryId || fallbackCategoryId,
 code: "",
 priceLkr: 0,
 prepTimeMins: 15,
 department: Department.Kitchen,
 kitchenStation: "",
 imageUrl: null,
 spicyLevel: 0,
 isVegetarian: false,
 isVegan: false,
 isHalal: false,
 isGlutenFree: false,
 isAvailable: true,
 };
 }

 return {
 titleEn: item.title.en,
 titleSi: item.title.si || "",
 titleTa: item.title.ta || "",
 descEn: item.description.en,
 descSi: item.description.si || "",
 descTa: item.description.ta || "",
 categoryId: item.categoryId,
 code: item.code,
 priceLkr: item.priceLkr,
 prepTimeMins: item.prepTimeMins || 15,
 department: item.department,
 kitchenStation: item.kitchenStation || "",
 imageUrl: item.imageUrl || null,
 spicyLevel: item.spicyLevel,
 isVegetarian: item.isVegetarian,
 isVegan: item.isVegan,
 isHalal: item.isHalal,
 isGlutenFree: item.isGlutenFree,
 isAvailable: item.isAvailable,
 };
}

// ============================================================================
// Main MenuItemModal Component
// ============================================================================

export function MenuItemModal({
 isOpen,
 initialItem,
 categories: propCategories,
 defaultCategoryId,
 onSave,
 onClose,
 className = "",
}: MenuItemModalProps) {
 const dialogId = useId();

 // Resolved categories
 const categories: ReadonlyArray<CategoryFilterOption> =
 propCategories && propCategories.length > 0
 ? propCategories
 : DEFAULT_DOMSPEED_CATEGORIES.map((c) => ({
 id: c.id,
 name: c.name,
 iconKey: c.iconKey,
 }));

 const fallbackCat = categories[0]?.id ?? "CAT-RICE-CURRY";
 const [form, setForm] = useState<MenuItemFormState>(() =>
 createInitialFormState(initialItem, defaultCategoryId, fallbackCat),
 );
 const [includedInMealPlans, setIncludedInMealPlans] = useState<ReadonlyArray<MealPlan>>([]);
 const [validationError, setValidationError] = useState<string | null>(null);

 if (!isOpen) return null;

 const updateField = <K extends keyof MenuItemFormState>(key: K, value: MenuItemFormState[K]) => {
 setForm((prev) => ({ ...prev, [key]: value }));
 };

 const handleFormSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const result = validateAndBuildItemPayload({
 initialItemId: initialItem?.id,
 displayOrder: initialItem?.displayOrder,
 ...form,
 includedInMealPlans,
 });

 if (!result.valid) {
 setValidationError(result.error);
 return;
 }

 setValidationError(null);
 onSave(result.payload);
 };

 return (
 <dialog
 className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 border-none m-0 w-full h-full max-w-none max-h-none ${className}`}
 open
 aria-labelledby={`${dialogId}-title`}
 >
 <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-2xl space-y-6">
 <ModalHeader isEditing={Boolean(initialItem)} dialogId={dialogId} onClose={onClose} />

 {validationError && (
 <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 text-xs font-semibold">
 {validationError}
 </div>
 )}

 <form onSubmit={handleFormSubmit} className="space-y-6">
 {/* 1. Trilingual Titles & Descriptions */}
 <TrilingualDishFields
 titleEn={form.titleEn}
 setTitleEn={(v) => updateField("titleEn", v)}
 titleSi={form.titleSi}
 setTitleSi={(v) => updateField("titleSi", v)}
 titleTa={form.titleTa}
 setTitleTa={(v) => updateField("titleTa", v)}
 descEn={form.descEn}
 setDescEn={(v) => updateField("descEn", v)}
 descSi={form.descSi}
 setDescSi={(v) => updateField("descSi", v)}
 descTa={form.descTa}
 setDescTa={(v) => updateField("descTa", v)}
 />

 {/* 2. Operational Pricing, Code, Prep Time & Department */}
 <OperationalDishFields
 categories={categories}
 categoryId={form.categoryId}
 setCategoryId={(v) => updateField("categoryId", v)}
 code={form.code}
 setCode={(v) => updateField("code", v)}
 priceLkr={form.priceLkr}
 setPriceLkr={(v) => updateField("priceLkr", v)}
 prepTimeMins={form.prepTimeMins}
 setPrepTimeMins={(v) => updateField("prepTimeMins", v)}
 department={form.department}
 setDepartment={(v) => updateField("department", v)}
 kitchenStation={form.kitchenStation}
 setKitchenStation={(v) => updateField("kitchenStation", v)}
 />

 {/* 3. 1:1 Square WebP Dish Photo Upload & Presets */}
 <DishPhotoManager
 currentImageUrl={form.imageUrl}
 onImageSelected={(url) => updateField("imageUrl", url)}
 />

 {/* 4. Spice Level Selector */}
 <SpiceLevelRadioSelector
 spicyLevel={form.spicyLevel}
 setSpicyLevel={(v) => updateField("spicyLevel", v)}
 />

 {/* 5. Dietary & Availability Toggles */}
 <DietaryAndStockToggles
 isVegetarian={form.isVegetarian}
 setIsVegetarian={(v) => updateField("isVegetarian", v)}
 isVegan={form.isVegan}
 setIsVegan={(v) => updateField("isVegan", v)}
 isHalal={form.isHalal}
 setIsHalal={(v) => updateField("isHalal", v)}
 isGlutenFree={form.isGlutenFree}
 setIsGlutenFree={(v) => updateField("isGlutenFree", v)}
 isAvailable={form.isAvailable}
 setIsAvailable={(v) => updateField("isAvailable", v)}
 />

 {/* 6. Meal-Plan Complimentary Inclusions */}
 <MealPlanInclusionCheckboxes
 includedInMealPlans={includedInMealPlans}
 setIncludedInMealPlans={setIncludedInMealPlans}
 />

 {/* Modal Actions */}
 <ModalFooterActions isEditing={Boolean(initialItem)} onClose={onClose} />
 </form>
 </div>
 </dialog>
 );
}
