import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Attendant In-Room Minibar Consumption 1-Tap Logger Modal (HkMinibarLoggerModal.tsx)
 *
 * Designed for room attendants inspecting a departing room during front-desk check-out.
 * Attendants tap consumed minibar items (e.g., 1x Lion Beer, 1x Cashews) to post
 * immediately to the reception guest folio, eliminating slow walkie-talkie calls.
 *
 * Operational & Hospitality Capabilities:
 * - Par-Stock checklist with rapid 1-tap decrement/increment steppers
 * - Instant "Nil Consumed / Minibar Intact" 1-tap clearance for untouched minibars
 * - 4-Stage compounding Sri Lankan statutory tax engine (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)
 * - Audio confirmation chime via Web Audio harmonic synthesizer
 * - High-contrast OLED dark mode with Apple HIG liquid glass surfaces
 * - Continuous squircles, >= 44x44pt touch targets, and tabular numbers (.tabular-nums-lkr)
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
 DEFAULT_MINIBAR_CATALOG,
 type MinibarItem,
 type MinibarItemCategory,
} from "../../lib/minibarCatalog.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface MinibarLoggedItem {
 readonly itemId: string;
 readonly code: string;
 readonly name: string;
 readonly category: MinibarItemCategory;
 readonly quantity: number;
 readonly parStock: number;
 readonly unitPriceLkr: number;
 readonly lineTotalLkr: number;
 readonly isComplimentary: boolean;
}

export interface MinibarTaxSummary {
 readonly totalPieces: number;
 readonly netBaseLkr: number;
 readonly scLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
}

export interface MinibarPostResult {
 readonly id: string;
 readonly roomNumber: string;
 readonly folioId: string;
 readonly attendantName: string;
 readonly postedAtIso: string;
 readonly consumedItems: readonly MinibarLoggedItem[];
 readonly summary: MinibarTaxSummary;
 readonly notes?: string | undefined;
 readonly isNilConsumption: boolean;
}

export type MinibarFilterCategory = "ALL" | MinibarItemCategory;

export interface HkMinibarLoggerModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly roomNumber: string;
 readonly guestName?: string | undefined;
 readonly folioId?: string | undefined;
 readonly roomTypeName?: string | undefined;
 readonly attendantName?: string | undefined;
 readonly departureTime?: string | undefined;
 readonly catalog?: readonly MinibarItem[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onPostToFolio: (result: MinibarPostResult) => Promise<void> | void;
 readonly onClearNilConsumption?: ((roomNumber: string) => Promise<void> | void) | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface ModalTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly departingBadge: string;
 readonly folioLabel: string;
 readonly nilConsumedAction: string;
 readonly resetAction: string;
 readonly postAction: string;
 readonly postingAction: string;
 readonly successTitle: string;
 readonly successDesc: string;
 readonly closeAction: string;
 readonly allCategories: string;
 readonly parStock: string;
 readonly complimentary: string;
 readonly summaryTitle: string;
 readonly netBase: string;
 readonly sc: string;
 readonly tdl: string;
 readonly sscl: string;
 readonly vat: string;
 readonly grandTotal: string;
 readonly notesLabel: string;
 readonly notesPlaceholder: string;
 readonly attendantLabel: string;
 readonly noItemsSelected: string;
}

const MODAL_TRANSLATIONS: Record<SupportedLanguage, ModalTranslations> = {
 en: {
 title: "In-Room Minibar Consumption",
 subtitle: "Front Desk Check-Out Clearance",
 departingBadge: "DEPARTING • FOLIO CLEARANCE",
 folioLabel: "Folio",
 nilConsumedAction: "Minibar Intact (Nil Consumed)",
 resetAction: "Reset All",
 postAction: "Post to Reception Folio",
 postingAction: "Posting to Folio...",
 successTitle: "Posted to Reception Folio",
 successDesc: "Reception checkout invoice updated instantly. Walkie-talkie call eliminated!",
 closeAction: "Close",
 allCategories: "All Items",
 parStock: "Par",
 complimentary: "Free",
 summaryTitle: "Folio Charge Summary (LKR)",
 netBase: "Net Base",
 sc: "Service Charge (10%)",
 tdl: "Tourism Dev Levy (1%)",
 sscl: "SSCL (2.5%)",
 vat: "VAT (18%)",
 grandTotal: "Total Chargeable",
 notesLabel: "Attendant Notes",
 notesPlaceholder: "e.g. 1 empty beer can in trash, cashews packet unsealed...",
 attendantLabel: "Attendant",
 noItemsSelected: "No consumed items selected. Minibar is either intact or select items below.",
 },
 si: {
 title: "කාමරයේ මිනි-බාර් පරිභෝජනය",
 subtitle: "පිටවීමේ ගිණුම් නිෂ්කාශනය",
 departingBadge: "පිටවීම • ගිණුම් පියවීම",
 folioLabel: "බිල්පත් අංකය",
 nilConsumedAction: "කිසිවක් භාවිතා කර නොමැත (සම්පූර්ණයි)",
 resetAction: "නැවත සකසන්න",
 postAction: "පිළිගැනීමේ ගිණුමට එක් කරන්න",
 postingAction: "ගිණුමට එක් කරමින්...",
 successTitle: "ගිණුමට සාර්ථකව එක් කරන ලදී",
 successDesc: "පිළිගැනීමේ බිල්පත ක්ෂණිකව යාවත්කාලීන විය. වෝකිටෝකි ඇමතුම් අවශ්ය නොවේ!",
 closeAction: "වසන්න",
 allCategories: "සියලු ද්රව්ය",
 parStock: "නියමිත",
 complimentary: "නොමිලේ",
 summaryTitle: "බිල්පත් සාරාංශය (LKR)",
 netBase: "ශුද්ධ මුදල",
 sc: "සේවා ගාස්තු (10%)",
 tdl: "සංචාරක සංවර්ධන බද්ද (1%)",
 sscl: "සමාජ ආරක්ෂණ බද්ද (2.5%)",
 vat: "එකතු කළ අගය මත බද්ද (18%)",
 grandTotal: "අය කළ යුතු මුළු මුදල",
 notesLabel: "සේවක සටහන්",
 notesPlaceholder: "උදා: හිස් බියර් කෑන් 1 ක් කුණු බක්කියේ, කජු පැකට්ටුව විවෘතයි...",
 attendantLabel: "කාර්ය මණ්ඩලය",
 noItemsSelected: "භාවිතා කළ ද්රව්ය සටහන් කර නොමැත. මිනි-බාර් සම්පූර්ණයි හෝ පහතින් තෝරන්න.",
 },
 ta: {
 title: "அறை மினிபார் நுகர்வுப் பதிவு",
 subtitle: "வெளியேறும் கட்டண அனுமதி",
 departingBadge: "வெளியேறுதல் • கட்டண அனுமதி",
 folioLabel: "கணக்கு எண்",
 nilConsumedAction: "எதுவும் பயன்படுத்தப்படவில்லை (முழுமையானது)",
 resetAction: "மீட்டமைக்க",
 postAction: "வரவேற்பு அறை கணக்கில் சேர்க்கவும்",
 postingAction: "கணக்கில் சேர்க்கப்படுகிறது...",
 successTitle: "அறை கணக்கில் வெற்றிகரமாக சேர்க்கப்பட்டது",
 successDesc: "வரவேற்பு பில் உடனடியாக புதுப்பிக்கப்பட்டது. வாக்கி-டாக்கி அழைப்பு தவிர்க்கப்பட்டது!",
 closeAction: "மூடு",
 allCategories: "அனைத்து பொருட்கள்",
 parStock: "இருப்பு",
 complimentary: "இலவசம்",
 summaryTitle: "கட்டண சுருக்கம் (LKR)",
 netBase: "நிகர தொகை",
 sc: "சேவை கட்டணம் (10%)",
 tdl: "சுற்றுலா வரி (1%)",
 sscl: "சமூக பாதுகாப்பு வரி (2.5%)",
 vat: "வாட் வரி (18%)",
 grandTotal: "மொத்த கட்டணம்",
 notesLabel: "பணியாளர் குறிப்புகள்",
 notesPlaceholder: "எ.கா: பியர் காலி பாட்டில் குப்பைத் தொட்டியில்...",
 attendantLabel: "பணியாளர்",
 noItemsSelected: "பொருட்கள் எதுவும் தேர்ந்தெடுக்கப்படவில்லை.",
 },
};

export function getModalText(lang: SupportedLanguage = "en"): ModalTranslations {
 return MODAL_TRANSLATIONS[lang] ?? MODAL_TRANSLATIONS.en;
}

// ============================================================================
// Pure Statutory Tax Engine & Helpers (Complexity <= 12)
// ============================================================================

export function calculateMinibarTaxSummary(
 consumedItems: readonly MinibarLoggedItem[],
): MinibarTaxSummary {
 let netBaseLkr = 0;
 let totalPieces = 0;

 for (const item of consumedItems) {
 if (!item.isComplimentary) {
 netBaseLkr += item.lineTotalLkr;
 }
 totalPieces += item.quantity;
 }

 // Stage 1: 10% Service Charge
 const scLkr = Math.round(netBaseLkr * 0.1 * 100) / 100;
 const afterSc = netBaseLkr + scLkr;

 // Stage 2: 1% Tourism Development Levy (TDL) on (Base + SC)
 const tdlLkr = Math.round(afterSc * 0.01 * 100) / 100;

 // Stage 3: 2.5% Social Security Contribution Levy (SSCL) on (Base + SC)
 const ssclLkr = Math.round(afterSc * 0.025 * 100) / 100;

 // Stage 4: 18% VAT on (Base + SC + SSCL)
 const vatBase = afterSc + ssclLkr;
 const vatLkr = Math.round(vatBase * 0.18 * 100) / 100;

 // Grand Total
 const grandTotalLkr = Math.round((afterSc + tdlLkr + ssclLkr + vatLkr) * 100) / 100;

 return {
 totalPieces,
 netBaseLkr: Math.round(netBaseLkr * 100) / 100,
 scLkr,
 tdlLkr,
 ssclLkr,
 vatLkr,
 grandTotalLkr,
 };
}

export function formatMinibarLkr(amount: number): string {
 return `LKR ${new Intl.NumberFormat("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount)}`;
}

export function getItemIcon(category: MinibarItemCategory): string {
 switch (category) {
 case "BEER_WINE":
 return "Beer";
 case "SPIRITS_MINIATURES":
 return "Spirit";
 case "SNACKS":
 return "Nuts";
 case "SOFT_DRINKS":
 return "Drink";
 case "WELLNESS_MINERAL":
 return "Water";
 }
}

export function buildLoggedItemsList(
 catalog: readonly MinibarItem[],
 tally: Readonly<Record<string, number>>,
 lang: SupportedLanguage,
): MinibarLoggedItem[] {
 const result: MinibarLoggedItem[] = [];

 for (const item of catalog) {
 const qty = tally[item.id] ?? 0;
 if (qty <= 0) continue;

 const unitPrice = item.isComplimentary ? 0 : item.sellingPriceLkr;
 const lineTotal = Math.round(unitPrice * qty * 100) / 100;
 const name = item.title[lang] || item.title.en;

 result.push({
 itemId: item.id,
 code: item.code,
 name,
 category: item.category,
 quantity: qty,
 parStock: item.defaultParStock,
 unitPriceLkr: unitPrice,
 lineTotalLkr: lineTotal,
 isComplimentary: item.isComplimentary,
 });
 }

 return result;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ModalHeaderProps {
 readonly roomNumber: string;
 readonly guestName?: string | undefined;
 readonly folioId: string;
 readonly roomTypeName?: string | undefined;
 readonly t: ModalTranslations;
 readonly onClose: () => void;
}

const ModalHeader: FC<ModalHeaderProps> = ({
 roomNumber,
 guestName,
 folioId,
 roomTypeName,
 t,
 onClose,
}) => {
 return (
 <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 border border-rose-500/30">
 {t.departingBadge}
 </span>
 <span className="text-[11px] font-mono font-semibold text-slate-400">
 {t.folioLabel}: {folioId}
 </span>
 </div>
 <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
 <span>Room {roomNumber}</span>
 {guestName && <span className="text-sm font-normal text-slate-700">({guestName})</span>}
 </h2>
 {roomTypeName && <p className="text-xs text-slate-400 mt-0.5">{roomTypeName}</p>}
 </div>

 <button
 type="button"
 onClick={onClose}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
 aria-label={t.closeAction}
 >
 <svg
 className="w-5 h-5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 role="img"
 aria-label={t.closeAction}
 >
 <title>{t.closeAction}</title>
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 </div>
 );
};

interface CategoryTabsProps {
 readonly activeCategory: MinibarFilterCategory;
 readonly onSelect: (category: MinibarFilterCategory) => void;
 readonly t: ModalTranslations;
}

const CategoryTabs: FC<CategoryTabsProps> = ({ activeCategory, onSelect, t }) => {
 const categories: Array<{ id: MinibarFilterCategory; label: string; icon: string }> = [
 { id: "ALL", label: t.allCategories, icon: "Clean" },
 { id: "BEER_WINE", label: "Beer & Wine", icon: "Beer" },
 { id: "SNACKS", label: "Snacks", icon: "Nuts" },
 { id: "SOFT_DRINKS", label: "Soft Drinks", icon: "Drink" },
 { id: "SPIRITS_MINIATURES", label: "Spirits", icon: "Spirit" },
 { id: "WELLNESS_MINERAL", label: "Water", icon: "Water" },
 ];

 return (
 <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
 {categories.map((c) => {
 const isSelected = activeCategory === c.id;
 return (
 <button
 key={c.id}
 type="button"
 onClick={() => onSelect(c.id)}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
 isSelected
 ? "bg-amber-500 text-slate-950 shadow-md font-bold"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 <span><DynamicTokenIcon token={c.icon} /></span>
 <span>{c.label}</span>
 </button>
 );
 })}
 </div>
 );
};

interface ItemRowProps {
 readonly item: MinibarItem;
 readonly quantity: number;
 readonly lang: SupportedLanguage;
 readonly t: ModalTranslations;
 readonly onIncrement: (id: string) => void;
 readonly onDecrement: (id: string) => void;
}

const ItemRow: FC<ItemRowProps> = ({ item, quantity, lang, t, onIncrement, onDecrement }) => {
 const isConsumed = quantity > 0;
 const itemName = item.title[lang] || item.title.en;

 return (
 <div
 className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
 isConsumed
 ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
 : "bg-slate-50 border-[#E2E8F0] hover:border-[#E2E8F0]"
 }`}
 >
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-2xl flex-shrink-0">{getItemIcon(item.category)}</span>
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-sm text-white truncate">{itemName}</span>
 {item.isComplimentary && (
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30">
 {t.complimentary}
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
 <span>
 {t.parStock}: {item.defaultParStock}
 </span>
 <span>•</span>
 <span className="font-mono tabular-nums-lkr text-amber-800 font-medium">
 {item.isComplimentary ? t.complimentary : formatMinibarLkr(item.sellingPriceLkr)}
 </span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 type="button"
 onClick={() => onDecrement(item.id)}
 disabled={quantity === 0}
 className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
 quantity > 0
 ? "bg-slate-50 hover:bg-white/25 text-slate-900 active:scale-95"
 : "bg-slate-50 text-slate-600 cursor-not-allowed"
 }`}
 aria-label={`Decrease ${itemName}`}
 >
 -
 </button>

 <span
 className={`w-8 text-center font-mono font-bold text-base tabular-nums-lkr ${
 isConsumed ? "text-amber-700" : "text-slate-400"
 }`}
 >
 {quantity}
 </span>

 <button
 type="button"
 onClick={() => onIncrement(item.id)}
 className="min-w-[44px] min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-lg flex items-center justify-center transition-all shadow-sm"
 aria-label={`Increase ${itemName}`}
 >
 +
 </button>
 </div>
 </div>
 );
};

interface TaxSummaryCardProps {
 readonly summary: MinibarTaxSummary;
 readonly t: ModalTranslations;
}

const TaxSummaryCard: FC<TaxSummaryCardProps> = ({ summary, t }) => {
 return (
 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0] space-y-1.5 text-xs">
 <div className="flex items-center justify-between font-bold text-slate-700 pb-1 border-b border-[#E2E8F0]">
 <span>{t.summaryTitle}</span>
 <span className="text-amber-700 font-mono tabular-nums-lkr">
 {summary.totalPieces} item{summary.totalPieces === 1 ? "" : "s"}
 </span>
 </div>

 <div className="flex justify-between text-slate-400">
 <span>{t.netBase}</span>
 <span className="font-mono tabular-nums-lkr">{formatMinibarLkr(summary.netBaseLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.sc}</span>
 <span className="font-mono tabular-nums-lkr">{formatMinibarLkr(summary.scLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.tdl}</span>
 <span className="font-mono tabular-nums-lkr">{formatMinibarLkr(summary.tdlLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.sscl}</span>
 <span className="font-mono tabular-nums-lkr">{formatMinibarLkr(summary.ssclLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.vat}</span>
 <span className="font-mono tabular-nums-lkr">{formatMinibarLkr(summary.vatLkr)}</span>
 </div>

 <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold text-slate-900">
 <span>{t.grandTotal}</span>
 <span className="text-base text-[#0B6E4F] font-mono tabular-nums-lkr">
 {formatMinibarLkr(summary.grandTotalLkr)}
 </span>
 </div>
 </div>
 );
};

interface SuccessReceiptProps {
 readonly result: MinibarPostResult;
 readonly t: ModalTranslations;
 readonly onClose: () => void;
}

const SuccessReceipt: FC<SuccessReceiptProps> = ({ result, t, onClose }) => {
 return (
 <div className="p-6 text-center space-y-4">
 <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></div>
 <div>
 <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t.successTitle}</h3>
 <p className="text-xs text-slate-700 mt-1">{t.successDesc}</p>
 </div>

 <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-left space-y-2 text-xs">
 <div className="flex justify-between">
 <span className="text-slate-400"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg><span className="sr-only">Room</span></span>
 <span className="font-bold text-slate-900">#{result.roomNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-400">Folio ID</span>
 <span className="font-mono text-slate-800">{result.folioId}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-400">Attendant</span>
 <span className="text-slate-800">{result.attendantName}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-400">Timestamp</span>
 <span className="font-mono text-slate-800">
 {new Date(result.postedAtIso).toLocaleTimeString()}
 </span>
 </div>
 <div className="pt-2 border-t border-[#E2E8F0] flex justify-between font-bold text-sm">
 <span className="text-slate-900">Amount Posted</span>
 <span className="text-[#0B6E4F] font-mono tabular-nums-lkr">
 {formatMinibarLkr(result.summary.grandTotalLkr)}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all active:scale-[0.98]"
 >
 {t.closeAction}
 </button>
 </div>
 );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const HkMinibarLoggerModal: FC<HkMinibarLoggerModalProps> = ({
 isOpen,
 onClose,
 roomNumber,
 guestName,
 folioId = `FOL-${roomNumber}`,
 roomTypeName,
 attendantName = "Housekeeping Runner",
 catalog = DEFAULT_MINIBAR_CATALOG,
 language = "en",
 onPostToFolio,
 onClearNilConsumption,
}) => {
 const notesId = useId();
 const t = getModalText(language);

 const [tally, setTally] = useState<Record<string, number>>({});
 const [activeCategory, setActiveCategory] = useState<MinibarFilterCategory>("ALL");
 const [notes, setNotes] = useState<string>("");
 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [postedResult, setPostedResult] = useState<MinibarPostResult | null>(null);

 // Filter items by category
 const filteredCatalog = useMemo(() => {
 if (activeCategory === "ALL") return catalog;
 return catalog.filter((item) => item.category === activeCategory);
 }, [catalog, activeCategory]);

 // Build logged items & taxes
 const loggedItems = useMemo(() => {
 return buildLoggedItemsList(catalog, tally, language);
 }, [catalog, tally, language]);

 const taxSummary = useMemo(() => {
 return calculateMinibarTaxSummary(loggedItems);
 }, [loggedItems]);

 if (!isOpen) return null;

 const handleIncrement = (itemId: string) => {
 setTally((prev) => ({
 ...prev,
 [itemId]: (prev[itemId] ?? 0) + 1,
 }));
 };

 const handleDecrement = (itemId: string) => {
 setTally((prev) => {
 const current = prev[itemId] ?? 0;
 if (current <= 1) {
 const next = { ...prev };
 delete next[itemId];
 return next;
 }
 return { ...prev, [itemId]: current - 1 };
 });
 };

 const handleReset = () => {
 setTally({});
 setNotes("");
 };

 const handleNilConsumption = async () => {
 setIsSubmitting(true);
 const result: MinibarPostResult = {
 id: `mb-nil-${Date.now()}`,
 roomNumber,
 folioId,
 attendantName,
 postedAtIso: new Date().toISOString(),
 consumedItems: [],
 summary: {
 totalPieces: 0,
 netBaseLkr: 0,
 scLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grandTotalLkr: 0,
 },
 notes: notes.trim() || "Minibar inspected: intact & nil consumed",
 isNilConsumption: true,
 };

 try {
 if (onClearNilConsumption) {
 await onClearNilConsumption(roomNumber);
 }
 await onPostToFolio(result);
 playOrderBell("PAYMENT_CONFIRMED");
 setPostedResult(result);
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleSubmit = async () => {
 if (loggedItems.length === 0) {
 await handleNilConsumption();
 return;
 }

 setIsSubmitting(true);
 const result: MinibarPostResult = {
 id: `mb-post-${Date.now()}`,
 roomNumber,
 folioId,
 attendantName,
 postedAtIso: new Date().toISOString(),
 consumedItems: loggedItems,
 summary: taxSummary,
 notes: notes.trim() || undefined,
 isNilConsumption: false,
 };

 try {
 await onPostToFolio(result);
 playOrderBell("NEW_ORDER");
 setPostedResult(result);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="modal-title"
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity animate-in fade-in border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass shadow-2xl overflow-hidden">
 {postedResult ? (
 <SuccessReceipt
 result={postedResult}
 t={t}
 onClose={() => {
 setPostedResult(null);
 onClose();
 }}
 />
 ) : (
 <>
 {/* Modal Header */}
 <div className="p-4 sm:p-5 flex-shrink-0">
 <ModalHeader
 roomNumber={roomNumber}
 guestName={guestName}
 folioId={folioId}
 roomTypeName={roomTypeName}
 t={t}
 onClose={onClose}
 />
 </div>

 {/* Quick Nil Action & Category Tabs */}
 <div className="px-4 sm:px-5 space-y-3 flex-shrink-0">
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={handleNilConsumption}
 disabled={isSubmitting}
 className="min-h-[44px] px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#0B6E4F] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
 >
 <span className="truncate">{t.nilConsumedAction}</span>
 </button>

 <button
 type="button"
 onClick={handleReset}
 disabled={isSubmitting || Object.keys(tally).length === 0}
 className="min-h-[44px] px-3 py-2 rounded-2xl bg-slate-50 hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
 >
 <span>↺</span>
 <span>{t.resetAction}</span>
 </button>
 </div>

 <CategoryTabs activeCategory={activeCategory} onSelect={setActiveCategory} t={t} />
 </div>

 {/* Scrollable Item Checklist */}
 <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-2 space-y-2.5">
 {filteredCatalog.map((item) => (
 <ItemRow
 key={item.id}
 item={item}
 quantity={tally[item.id] ?? 0}
 lang={language}
 t={t}
 onIncrement={handleIncrement}
 onDecrement={handleDecrement}
 />
 ))}

 {filteredCatalog.length === 0 && (
 <div className="py-8 text-center text-xs text-slate-500">
 No items in this category.
 </div>
 )}
 </div>

 {/* Summary & Sticky Submission Toolbar */}
 <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-white backdrop-blur-md space-y-3 flex-shrink-0">
 {loggedItems.length > 0 && <TaxSummaryCard summary={taxSummary} t={t} />}

 {/* Notes Input */}
 <div>
 <label
 htmlFor={notesId}
 className="block text-[11px] font-semibold text-slate-400 mb-1"
 >
 {t.notesLabel}
 </label>
 <input
 id={notesId}
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={t.notesPlaceholder}
 className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
 />
 </div>

 {/* Action Button */}
 <button
 type="button"
 onClick={handleSubmit}
 disabled={isSubmitting}
 className={`w-full min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${
 loggedItems.length > 0
 ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
 : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
 }`}
 >
 {isSubmitting ? (
 <>
 <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
 <span>{t.postingAction}</span>
 </>
 ) : (
 <>
 <span>
 {loggedItems.length > 0
 ? `${t.postAction} (${formatMinibarLkr(taxSummary.grandTotalLkr)})`
 : t.nilConsumedAction}
 </span>
 </>
 )}
 </button>
 </div>
 </>
 )}
 </div>
 </dialog>
 );
};
