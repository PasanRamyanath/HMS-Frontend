import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import { useId, useState } from "react";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SeedDepartmentKey = "HOUSEKEEPING" | "ROOM_SERVICE" | "BAR" | "SPA";

export interface SeedDepartmentOption {
 readonly key: SeedDepartmentKey;
 readonly label: {
 readonly en: string;
 readonly si: string;
 readonly ta: string;
 };
 readonly iconEmoji: string;
 readonly defaultItemCount: number;
 readonly complimentaryCount: number;
 readonly description: {
 readonly en: string;
 readonly si: string;
 readonly ta: string;
 };
}

export interface SeedCatalogPreview {
 readonly totalCategories: number;
 readonly totalItems: number;
 readonly totalComplimentary: number;
 readonly selectedDepartments: ReadonlyArray<SeedDepartmentKey>;
 readonly estimatedSeedSeconds: number;
}

export interface SeedCatalogSummary {
 readonly tenantId: string;
 readonly seededAtIso: string;
 readonly categoriesCreated: number;
 readonly itemsCreated: number;
 readonly complimentaryItemsCount: number;
 readonly departments: ReadonlyArray<SeedDepartmentKey>;
 readonly success: boolean;
}

export interface SeedCatalogButtonProps {
 readonly tenantId?: string | undefined;
 readonly onSeedComplete?: ((summary: SeedCatalogSummary) => void) | undefined;
 readonly onSeedError?: ((error: string) => void) | undefined;
 readonly disabled?: boolean | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Department Options Configuration
// ============================================================================

export const SEED_DEPARTMENT_OPTIONS: ReadonlyArray<SeedDepartmentOption> = [
 {
 key: "HOUSEKEEPING",
 label: {
 en: "Housekeeping & Express Amenities",
 si: "කාමර පහසුකම් සහ නඩත්තු සේවා",
 ta: "வீட்டு பராமரிப்பு மற்றும் விரைவு வசதிகள்",
 },
 iconEmoji: "Clean",
 defaultItemCount: 15,
 complimentaryCount: 15,
 description: {
 en: "15 zero-cost items: Extra Bath Towel, Bottled Spring Water 1L, Mosquito Vaporizer, UK Plug Adapter, Iron & Board, Prayer Mat, Laundry Pickup, etc.",
 si: "නොමිලේ ලබාදෙන භාණ්ඩ 15ක්: නාන තුවා, වතුර බෝතල්, මදුරු නාශක, ප්ලග් ඇඩැප්ටර්, ඉස්තිරික්ක, යාඥා පැදුරු ආදිය.",
 ta: "15 இலவச வசதிகள்: குளியல் துண்டு, குடிநீர், கொசு விரட்டி, பிளக் அடாப்டர், இஸ்திரி பெட்டி, தொழுகை பாய் போன்றவை.",
 },
 },
 {
 key: "ROOM_SERVICE",
 label: {
 en: "Sri Lankan Breakfast & Dining",
 si: "ශ්රී ලාංකික උදෑසන ආහාර හා භෝජන",
 ta: "இலங்கை காலை உணவு மற்றும் உணவுகள்",
 },
 iconEmoji: "Kitchen",
 defaultItemCount: 4,
 complimentaryCount: 0,
 description: {
 en: "Authentic Hopper Feast, String Hoppers with Kiri Hodi & Pol Sambol, Ceylon BOPF Tea Pots, and Tropical Fruit Platters.",
 si: "නැවුම් ආප්ප, ඉඳිආප්ප, පොල් සම්බෝල, කිරි හොදි සහ සිලෝන් තේ.",
 ta: "ஆப்பம், இடியாப்பம், சம்பல், பால் சொதி மற்றும் சிலோன் தேநீர்.",
 },
 },
 {
 key: "BAR",
 label: {
 en: "Poolside Bar & Ceylon Spirits",
 si: "තටාකාංගණ බාර් සහ කොක්ටේල්",
 ta: "குளக்கரை மதுபானம் மற்றும் பானங்கள்",
 },
 iconEmoji: "Drink",
 defaultItemCount: 3,
 complimentaryCount: 0,
 description: {
 en: "Fresh King Coconut (Thambili), Chilled Lion Lager Beer 625ml, and Old Reserve Coconut Arrack Cocktails.",
 si: "නැවුම් තැඹිලි, ලයන් ලැගර් බියර් සහ ශ්රී ලාංකික පොල් අරක්කු කොක්ටේල්.",
 ta: "இயற்கை இளநீர், லயன் பீர் மற்றும் தேங்காய் அரக் காக்டெய்ல்.",
 },
 },
 {
 key: "SPA",
 label: {
 en: "Ayurveda Wellness & Spa",
 si: "ආයුර්වේද ස්පා සහ සුවතා සත්කාර",
 ta: "ஆயுர்வேத ஸ்பா மற்றும் ஆரோக்கிய சிகிச்சை",
 },
 iconEmoji: "Eco",
 defaultItemCount: 3,
 complimentaryCount: 0,
 description: {
 en: "Authentic 60-min Abhyanga Full Body Herbal Oil Massage, Shirodhara Flow Therapy, and Herbal Steam Baths.",
 si: "මිනිත්තු 60 අභ්යංග තෙල් සම්බාහනය, ශිරෝධාරා සහ ඖෂධීය වාෂ්ප ස්නානය.",
 ta: "அப்யங்க மூலிகை மசாஜ், சிரோதாரா மற்றும் மூலிகை நீராவி சிகிச்சை.",
 },
 },
];

// ============================================================================
// Pure Helpers
// ============================================================================

export function calculateSeedPreview(
 selectedDepartments: ReadonlyArray<SeedDepartmentKey>,
): SeedCatalogPreview {
 const activeOptions = SEED_DEPARTMENT_OPTIONS.filter((opt) =>
 selectedDepartments.includes(opt.key),
 );

 const totalCategories = activeOptions.length;
 const totalItems = activeOptions.reduce((sum, opt) => sum + opt.defaultItemCount, 0);
 const totalComplimentary = activeOptions.reduce((sum, opt) => sum + opt.complimentaryCount, 0);

 return {
 totalCategories,
 totalItems,
 totalComplimentary,
 selectedDepartments,
 estimatedSeedSeconds: totalItems > 0 ? 1.5 : 0,
 };
}

export function executeCatalogSeedSimulation(
 tenantId: string,
 selectedDepartments: ReadonlyArray<SeedDepartmentKey>,
): SeedCatalogSummary {
 const preview = calculateSeedPreview(selectedDepartments);

 return {
 tenantId: tenantId || "demo-hotel",
 seededAtIso: new Date().toISOString(),
 categoriesCreated: preview.totalCategories,
 itemsCreated: preview.totalItems,
 complimentaryItemsCount: preview.totalComplimentary,
 departments: selectedDepartments,
 success: preview.totalItems > 0,
 };
}

export function resolveOptionText(
 textObj: { readonly en: string; readonly si: string; readonly ta: string },
 lang: SupportedLanguage,
): string {
 if (lang === "si" && textObj.si) {
 return textObj.si;
 }
 if (lang === "ta" && textObj.ta) {
 return textObj.ta;
 }
 return textObj.en;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface SeedSummaryBannerProps {
 readonly preview: SeedCatalogPreview;
}

export function SeedSummaryBanner({ preview }: SeedSummaryBannerProps) {
 return (
 <div
 className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-apple-gray-100/70 border border-apple-gray-200 "
 data-testid="seed-summary-banner"
 >
 <div className="text-center">
 <span className="block text-[10px] uppercase font-bold text-apple-gray-500 tracking-wider">
 Categories
 </span>
 <span className="text-xl font-bold text-apple-gray-900 tabular-nums-lkr">
 {preview.totalCategories}
 </span>
 </div>
 <div className="text-center border-x border-apple-gray-200 ">
 <span className="block text-[10px] uppercase font-bold text-apple-gray-500 tracking-wider">
 Total Items
 </span>
 <span className="text-xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {preview.totalItems}
 </span>
 </div>
 <div className="text-center">
 <span className="block text-[10px] uppercase font-bold text-apple-gray-500 tracking-wider">
 Free Amenities
 </span>
 <span className="text-xl font-bold text-emerald-600 tabular-nums-lkr">
 {preview.totalComplimentary}
 </span>
 </div>
 </div>
 );
}

export interface DepartmentSelectorListProps {
 readonly selectedKeys: ReadonlyArray<SeedDepartmentKey>;
 readonly onToggle: (key: SeedDepartmentKey) => void;
 readonly lang: SupportedLanguage;
}

export function DepartmentSelectorList({
 selectedKeys,
 onToggle,
 lang,
}: DepartmentSelectorListProps) {
 return (
 <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1" data-testid="dept-selector-list">
 {SEED_DEPARTMENT_OPTIONS.map((opt) => {
 const isSelected = selectedKeys.includes(opt.key);
 return (
 <button
 key={opt.key}
 type="button"
 onClick={() => onToggle(opt.key)}
 className={`w-full text-left p-3.5 rounded-2xl border transition-all apple-touch-target flex items-start gap-3 ${
 isSelected
 ? "bg-[#0B6E4F]/10 border-apple-blue/30 text-apple-gray-900 shadow-xs"
 : "bg-white/40 border-apple-gray-200 text-apple-gray-600 hover:bg-apple-gray-100/40"
 }`}
 data-testid={`dept-checkbox-${opt.key}`}
 aria-pressed={isSelected}
 >
 <div className="text-2xl shrink-0 mt-0.5" aria-hidden="true">
 <DynamicTokenIcon token={opt.iconEmoji} />
 </div>
 <div className="grow min-w-0">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-apple-gray-900 ">
 {resolveOptionText(opt.label, lang)}
 </span>
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
 isSelected
 ? "bg-[#0B6E4F] text-white border-apple-blue"
 : "bg-apple-gray-200 text-apple-gray-600 border-transparent"
 }`}
 >
 {opt.defaultItemCount} items
 </span>
 </div>
 <p className="text-[11px] text-apple-gray-500 mt-1 line-clamp-2">
 {resolveOptionText(opt.description, lang)}
 </p>
 </div>
 </button>
 );
 })}
 </div>
 );
}

// ============================================================================
// Main SeedCatalogButton Component
// ============================================================================

export function SeedCatalogButton({
 tenantId = "demo-hotel",
 onSeedComplete,
 onSeedError,
 disabled = false,
 className = "",
}: SeedCatalogButtonProps) {
 const { currentLanguage } = useTranslation();
 const dialogTitleId = useId();

 const [isOpen, setIsOpen] = useState(false);
 const [isSeeding, setIsSeeding] = useState(false);
 const [completedSummary, setCompletedSummary] = useState<SeedCatalogSummary | null>(null);

 const [selectedDepts, setSelectedDepts] = useState<ReadonlyArray<SeedDepartmentKey>>([
 "HOUSEKEEPING",
 "ROOM_SERVICE",
 "BAR",
 "SPA",
 ]);

 const preview = calculateSeedPreview(selectedDepts);

 const handleToggleDept = (key: SeedDepartmentKey) => {
 if (selectedDepts.includes(key)) {
 setSelectedDepts(selectedDepts.filter((k) => k !== key));
 } else {
 setSelectedDepts([...selectedDepts, key]);
 }
 };

 const handleExecuteSeed = () => {
 if (preview.totalItems === 0) {
 if (onSeedError) {
 onSeedError("Please select at least one department category to seed.");
 }
 return;
 }

 setIsSeeding(true);

 // Instant execution (< 2 seconds simulation)
 setTimeout(() => {
 const summary = executeCatalogSeedSimulation(tenantId, selectedDepts);
 setCompletedSummary(summary);
 setIsSeeding(false);

 if (onSeedComplete) {
 onSeedComplete(summary);
 }
 }, 600);
 };

 const handleClose = () => {
 setIsOpen(false);
 setCompletedSummary(null);
 };

 return (
 <>
 {/* 1-Click Trigger Button */}
 <button
 type="button"
 onClick={() => setIsOpen(true)}
 disabled={disabled}
 className={`px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-2xl shadow-sm transition-all apple-touch-target flex items-center gap-2 ${className}`}
 data-testid="seed-catalog-open-btn"
 aria-label="Seed Sri Lankan Hotel Menu and Housekeeping Catalog"
 >
 
 <span>Seed Ceylon Catalog (25 Items)</span>
 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-900 font-mono">
 &lt; 2s
 </span>
 </button>

 {/* Modal Dialog Sheet */}
 {isOpen && (
 <dialog
 open
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in w-full h-full border-none max-w-none max-h-none"
 aria-modal="true"
 aria-labelledby={dialogTitleId}
 data-testid="seed-catalog-dialog"
 >
 <div className="w-full max-w-lg apple-liquid-glass rounded-2xl p-6 shadow-2xl border border-[#E2E8F0] space-y-5 animate-scale-up">
 {/* Modal Header */}
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xl"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18"/></svg><span className="sr-only">Clean</span></span>
 <h3
 id={dialogTitleId}
 className="text-base font-bold text-apple-gray-900 "
 >
 1-Click Sri Lankan Catalog Seeder
 </h3>
 </div>
 <p className="text-xs text-apple-gray-500 mt-1">
 Instantly populates 25 authentic Sri Lankan hospitality items and 15 free express
 housekeeping amenities.
 </p>
 </div>
 <button
 type="button"
 onClick={handleClose}
 className="text-apple-gray-400 hover:text-apple-gray-600 text-lg font-bold p-1 rounded-full transition-colors"
 aria-label="Close dialog"
 data-testid="seed-dialog-close-btn"
 >
 x
 </button>
 </div>

 {completedSummary ? (
 /* Success Confirmation View */
 <div className="py-6 text-center space-y-4" data-testid="seed-success-view">
 <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></div>
 <div>
 <h4 className="text-base font-bold text-apple-gray-900 ">
 Catalog Successfully Populated!
 </h4>
 <p className="text-xs text-apple-gray-500 mt-1 max-w-sm mx-auto">
 Created{" "}
 <strong className="text-apple-gray-900 tabular-nums-lkr">
 {completedSummary.itemsCreated} items
 </strong>{" "}
 across{" "}
 <strong className="text-apple-gray-900 tabular-nums-lkr">
 {completedSummary.categoriesCreated} departments
 </strong>
 , including {completedSummary.complimentaryItemsCount} complimentary amenities.
 </p>
 </div>

 <div className="pt-2">
 <button
 type="button"
 onClick={handleClose}
 className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-2xl shadow-sm transition-all apple-touch-target"
 data-testid="seed-done-btn"
 >
 Done &amp; Explore Catalog
 </button>
 </div>
 </div>
 ) : (
 /* Interactive Seeding Configuration */
 <>
 {/* Metrics Banner */}
 <SeedSummaryBanner preview={preview} />

 {/* Department Checklist */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-bold text-apple-gray-700 ">
 Select Department Categories to Seed:
 </span>
 <button
 type="button"
 onClick={() =>
 setSelectedDepts(
 selectedDepts.length === 4
 ? ["HOUSEKEEPING"]
 : ["HOUSEKEEPING", "ROOM_SERVICE", "BAR", "SPA"],
 )
 }
 className="text-[11px] text-[#0B6E4F] font-semibold hover:underline"
 >
 {selectedDepts.length === 4 ? "Select Minimal" : "Select All (4)"}
 </button>
 </div>

 <DepartmentSelectorList
 selectedKeys={selectedDepts}
 onToggle={handleToggleDept}
 lang={currentLanguage}
 />
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-2 border-t border-apple-gray-200 ">
 <button
 type="button"
 onClick={handleClose}
 disabled={isSeeding}
 className="px-4 py-2 text-xs font-semibold text-apple-gray-600 hover:text-apple-gray-900 apple-touch-target"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleExecuteSeed}
 disabled={isSeeding || preview.totalItems === 0}
 className="px-5 py-2.5 bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 disabled:opacity-40 text-white text-xs font-semibold rounded-2xl shadow-sm transition-all apple-touch-target flex items-center gap-2"
 data-testid="execute-seed-btn"
 >
 {isSeeding ? (
 <>
 <span className="animate-spin text-sm" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span className="sr-only">Wait</span></span>
 <span>Seeding Catalog…</span>
 </>
 ) : (
 <>
 <span>Populate</span>
 <span className="tabular-nums-lkr font-bold">
 {preview.totalItems} Items Now
 </span>
 </>
 )}
 </button>
 </div>
 </>
 )}
 </div>
 </dialog>
 )}
 </>
 );
}
