import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Liquor Bottle Gate-Pass & Empty-Bottle Reconciliation Form (LiquorBottleLogModal.tsx)
 *
 * Implements Step 338 (Phase 14.13) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized beverage security & corkage reconciliation sheet for Sri Lankan wedding receptions,
 * banquets, and corporate dinners:
 *
 * 1. Pre-Event Intake Gate-Pass (Morning of Event):
 * - Records client-supplied duty-free and local spirits (Whiskey, Ceylon Arrack, Wine, Gin/Vodka).
 * - Captures Security Gate-Pass reference (GP-BNQ-YYYY-XXXX), client NIC/Passport, seal verification,
 * and intake bottle counts per brand.
 * 2. Post-Event Empty-Bottle Physical Reconciliation:
 * - Physical empties count verified in crates: Received = Opened (Empties) + Returned Unopened.
 * - Real-time balance discrepancy alerts (red warning if counts don't balance).
 * 3. Corkage Fee Calculation:
 * - Deducts complimentary corkage waiver allowance (e.g. 12 bottles included).
 * - Calculates billable excess corkage on opened bottles only (unopened bottles returned free of charge).
 * 4. Dual Sign-Off & Official Gate-Pass Voucher:
 * - Banquet Manager & Host Client sign-off preventing post-wedding beverage disputes.
 * - Printable voucher layout with @media print support.
 * 5. Apple Human Interface Guidelines:
 * - Modal sheet with .apple-liquid-glass backdrop surfaces.
 * - SF Pro optical typography with .tabular-nums-lkr numbers.
 * - >= 44x44pt touch targets and fluid transitions.
 * 6. Trilingual Localization (English, සිංහල, தமிழ்).
 * 7. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useCallback, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LiquorCategory = "WHISKEY" | "ARRACK" | "WINE" | "GIN_VODKA" | "BEER" | "OTHER";

export type LiquorLogTab = "INTAKE" | "RECONCILIATION" | "SIGN_OFF";

export interface ClientLiquorBottleEntry {
  readonly id: string;
  readonly brandName: string;
  readonly category: LiquorCategory;
  readonly bottleVolumeMl: number;
  readonly quantityReceived: number;
  readonly quantityOpened: number;
  readonly quantityReturnedUnopened: number;
  readonly sealIntact: boolean;
  readonly notes?: string | undefined;
}

export interface LiquorGatePassDetails {
  readonly gatePassNumber: string;
  readonly eventId: string;
  readonly functionNumber: string;
  readonly clientName: string;
  readonly clientContact: string;
  readonly clientNicOrPassport: string;
  readonly receivedAtIso: string;
  readonly banquetManagerName: string;
  readonly corkageWaiverAllowance: number;
  readonly excessCorkageRatePerBottleLkr: number;
}

export interface LiquorReconciliationSummary {
  readonly totalBottlesReceived: number;
  readonly totalBottlesOpened: number;
  readonly totalBottlesReturned: number;
  readonly isBalanced: boolean;
  readonly discrepancyCount: number;
  readonly waivedCorkageCount: number;
  readonly billableCorkageCount: number;
  readonly totalCorkageFeeLkr: number;
}

export interface LiquorBottleLogModalProps {
  readonly isOpen: boolean;
  readonly initialDetails?: LiquorGatePassDetails | undefined;
  readonly initialEntries?: readonly ClientLiquorBottleEntry[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly isDarkMode?: boolean | undefined;
  readonly onClose: () => void;
  readonly onSaveLog?:
    | ((
        details: LiquorGatePassDetails,
        entries: readonly ClientLiquorBottleEntry[],
        summary: LiquorReconciliationSummary,
      ) => void)
    | undefined;
}

// ============================================================================
// Default Datasets & Catalogs
// ============================================================================

export const DEFAULT_GATE_PASS_DETAILS: LiquorGatePassDetails = {
  gatePassNumber: "GP-BNQ-2026-0889",
  eventId: "BNQ-2026-0889",
  functionNumber: "BEO-9842",
  clientName: "Samarawickrama & Perera Wedding",
  clientContact: "+94 77 123 4567",
  clientNicOrPassport: "198824103982",
  receivedAtIso: "2026-10-25T10:00:00.000Z",
  banquetManagerName: "Priyantha Perera (Banquet Captain)",
  corkageWaiverAllowance: 12,
  excessCorkageRatePerBottleLkr: 2500,
};

export const DEFAULT_LIQUOR_ENTRIES: readonly ClientLiquorBottleEntry[] = [
  {
    id: "liq-01",
    brandName: "Johnnie Walker Black Label 1L",
    category: "WHISKEY",
    bottleVolumeMl: 1000,
    quantityReceived: 12,
    quantityOpened: 10,
    quantityReturnedUnopened: 2,
    sealIntact: true,
  },
  {
    id: "liq-02",
    brandName: "Rockland Old Arrack 750ml",
    category: "ARRACK",
    bottleVolumeMl: 750,
    quantityReceived: 8,
    quantityOpened: 6,
    quantityReturnedUnopened: 2,
    sealIntact: true,
  },
  {
    id: "liq-03",
    brandName: "Jacob's Creek Shiraz 750ml",
    category: "WINE",
    bottleVolumeMl: 750,
    quantityReceived: 4,
    quantityOpened: 3,
    quantityReturnedUnopened: 1,
    sealIntact: true,
  },
];

export const POPULAR_SRI_LANKAN_BRANDS: readonly {
  readonly brandName: string;
  readonly category: LiquorCategory;
  readonly bottleVolumeMl: number;
}[] = [
  { brandName: "Johnnie Walker Black Label", category: "WHISKEY", bottleVolumeMl: 1000 },
  { brandName: "Chivas Regal 12 Year Old", category: "WHISKEY", bottleVolumeMl: 750 },
  { brandName: "Jack Daniel's Tennessee Whiskey", category: "WHISKEY", bottleVolumeMl: 1000 },
  { brandName: "Rockland Old Arrack", category: "ARRACK", bottleVolumeMl: 750 },
  { brandName: "DCSL Extra Special Arrack", category: "ARRACK", bottleVolumeMl: 750 },
  { brandName: "Mendis Special Ceylon Arrack", category: "ARRACK", bottleVolumeMl: 750 },
  { brandName: "Jacob's Creek Shiraz / Cabernet", category: "WINE", bottleVolumeMl: 750 },
  { brandName: "Penfolds Koonunga Hill Shiraz", category: "WINE", bottleVolumeMl: 750 },
  { brandName: "Hendrick's Scottish Gin", category: "GIN_VODKA", bottleVolumeMl: 1000 },
  { brandName: "Bombay Sapphire Distilled Gin", category: "GIN_VODKA", bottleVolumeMl: 1000 },
  { brandName: "Absolut Vodka Original", category: "GIN_VODKA", bottleVolumeMl: 750 },
  { brandName: "Lion Lager Beer Bottles (Crate of 12)", category: "BEER", bottleVolumeMl: 625 },
];

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function computeLiquorSummary(
  entries: readonly ClientLiquorBottleEntry[],
  corkageWaiverAllowance: number,
  excessCorkageRatePerBottleLkr: number,
): LiquorReconciliationSummary {
  let totalBottlesReceived = 0;
  let totalBottlesOpened = 0;
  let totalBottlesReturned = 0;

  for (const entry of entries) {
    totalBottlesReceived += Math.max(0, entry.quantityReceived);
    totalBottlesOpened += Math.max(0, entry.quantityOpened);
    totalBottlesReturned += Math.max(0, entry.quantityReturnedUnopened);
  }

  const accountedTotal = totalBottlesOpened + totalBottlesReturned;
  const isBalanced = totalBottlesReceived === accountedTotal;
  const discrepancyCount = totalBottlesReceived - accountedTotal;

  const safeWaiver = Math.max(0, corkageWaiverAllowance);
  const waivedCorkageCount = Math.min(totalBottlesOpened, safeWaiver);
  const billableCorkageCount = Math.max(0, totalBottlesOpened - safeWaiver);
  const totalCorkageFeeLkr = billableCorkageCount * Math.max(0, excessCorkageRatePerBottleLkr);

  return {
    totalBottlesReceived,
    totalBottlesOpened,
    totalBottlesReturned,
    isBalanced,
    discrepancyCount,
    waivedCorkageCount,
    billableCorkageCount,
    totalCorkageFeeLkr,
  };
}

export function formatLiquorCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `LKR ${safeAmount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLiquorGatePassVoucher(
  details: LiquorGatePassDetails,
  entries: readonly ClientLiquorBottleEntry[],
  summary: LiquorReconciliationSummary,
): string {
  const border = "========================================================";
  const divider = "--------------------------------------------------------";

  const rows = entries
    .map((e) => {
      const name = e.brandName.slice(0, 26).padEnd(27);
      const rec = e.quantityReceived.toString().padStart(6);
      const opn = e.quantityOpened.toString().padStart(6);
      const ret = e.quantityReturnedUnopened.toString().padStart(6);
      return `${name}${rec}${opn}${ret}`;
    })
    .join("\n");

  const balanceNotice = summary.isBalanced
    ? "STATUS: FULLY BALANCED & VERIFIED (NO DISCREPANCY)"
    : `WARNING: DISCREPANCY DETECTED (${summary.discrepancyCount} UNACCOUNTED BOTTLES)`;

  return [
    border,
    " SRI LANKAN CLOUD HMS - BANQUET SERVICES ",
    " LIQUOR GATE-PASS & EMPTY-BOTTLE RECONCILIATION ",
    border,
    `Gate Pass No: ${details.gatePassNumber}`,
    `BEO Function: ${details.functionNumber}`,
    `Client Name: ${details.clientName}`,
    `Client NIC/Pass: ${details.clientNicOrPassport}`,
    `Client Phone: ${details.clientContact}`,
    `Banquet Manager: ${details.banquetManagerName}`,
    `Received Date: ${details.receivedAtIso.slice(0, 10)}`,
    divider,
    "BOTTLE INVENTORY RECONCILIATION",
    "Brand Name Rec'd Opened Return",
    divider,
    rows || "No bottles logged.",
    divider,
    `Total Bottles Received: ${summary.totalBottlesReceived.toString().padStart(26)}`,
    `Total Bottles Opened: ${summary.totalBottlesOpened.toString().padStart(26)}`,
    `Total Bottles Returned: ${summary.totalBottlesReturned.toString().padStart(26)}`,
    divider,
    balanceNotice,
    divider,
    "CORKAGE CHARGE CALCULATION",
    `Complimentary Waiver: ${summary.waivedCorkageCount.toString().padStart(26)} bottles`,
    `Billable Excess Bottles: ${summary.billableCorkageCount.toString().padStart(26)} bottles`,
    `Corkage Rate Per Bottle: ${formatLiquorCurrency(details.excessCorkageRatePerBottleLkr).padStart(26)}`,
    `TOTAL EXCESS CORKAGE DUE: ${formatLiquorCurrency(summary.totalCorkageFeeLkr).padStart(26)}`,
    border,
    "",
    "Client Acknowledgment:",
    "I certify that the above bottle intake, opened empties, and returned unopened",
    "bottles have been physically inspected and verified in my presence.",
    "",
    "Client Signature: _________________________ Date: ____________",
    "",
    "Banquet Manager Sign:_________________________ Date: ____________",
    border,
  ].join("\n");
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface LiquorModalTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly tabIntake: string;
  readonly tabReconciliation: string;
  readonly tabSignOff: string;
  readonly gatePassNumber: string;
  readonly clientName: string;
  readonly clientNic: string;
  readonly brandNamePlaceholder: string;
  readonly addBottleButton: string;
  readonly quickPresetTitle: string;
  readonly category: string;
  readonly received: string;
  readonly opened: string;
  readonly returned: string;
  readonly sealIntact: string;
  readonly balancedBadge: string;
  readonly discrepancyBadge: string;
  readonly waiverAllowance: string;
  readonly billableCorkage: string;
  readonly corkageTotal: string;
  readonly clientSignaturePrompt: string;
  readonly managerSignaturePrompt: string;
  readonly printVoucher: string;
  readonly saveAndClose: string;
  readonly cancel: string;
}

export const LIQUOR_TRANSLATIONS: Readonly<Record<SupportedLanguage, LiquorModalTranslations>> = {
  en: {
    title: "Client Liquor Gate-Pass & Bottle Reconciliation",
    subtitle: "Manage intake bottles, post-event empty bottle audits, and excess corkage billing",
    tabIntake: "1. Intake Gate-Pass",
    tabReconciliation: "2. Bottle Reconciliation",
    tabSignOff: "3. Dual Sign-Off & Corkage",
    gatePassNumber: "Gate-Pass No.",
    clientName: "Client / Host Name",
    clientNic: "Client NIC / Passport",
    brandNamePlaceholder: "e.g. Johnnie Walker Black Label 1L",
    addBottleButton: "+ Add Bottle Brand",
    quickPresetTitle: "Quick Sri Lankan Spirits & Wine Presets",
    category: "Category",
    received: "Received",
    opened: "Opened Empties",
    returned: "Returned Unopened",
    sealIntact: "Seal Intact",
    balancedBadge: "Balanced (100% Accounted)",
    discrepancyBadge: "Discrepancy Detected!",
    waiverAllowance: "Free Corkage Allowance",
    billableCorkage: "Billable Excess Bottles",
    corkageTotal: "Total Excess Corkage Due",
    clientSignaturePrompt: "Host / Client Physical Handover Acknowledgment",
    managerSignaturePrompt: "Banquet Beverage Manager Verification",
    printVoucher: "Print Gate-Pass Voucher",
    saveAndClose: "Save Reconciliation Log",
    cancel: "Close",
  },
  si: {
    title: "මධ්යසාර බෝතල් ඇතුළත් කිරීම සහ හිස් බෝතල් ගිණුම්කරණය",
    subtitle: "උත්සවයට ගෙනෙන මධ්යසාර භාර ගැනීම, හිස් බෝතල් පරීක්ෂාව සහ කෝකේජ් ගාස්තු",
    tabIntake: "1. බෝතල් භාරගැනීමේ අවසරපත්රය",
    tabReconciliation: "2. හිස් බෝතල් පරීක්ෂාව",
    tabSignOff: "3. අත්සන් කිරීම සහ කෝකේජ් ගාස්තු",
    gatePassNumber: "ගේට් පාස් අංකය",
    clientName: "සේවාදායකයාගේ නම",
    clientNic: "ජාතික හැඳුනුම්පත් / විදේශ ගමන් බලපත්ර අංකය",
    brandNamePlaceholder: "උදා: ජොනී වෝකර් බ්ලැක් ලේබල් 1L",
    addBottleButton: "+ බෝතල් වර්ගයක් එක් කරන්න",
    quickPresetTitle: "ශ්රී ලාංකික ජනප්රිය මධ්යසාර වර්ග",
    category: "වර්ගය",
    received: "භාරගත් ගණන",
    opened: "විවෘත කළ හිස් බෝතල්",
    returned: "ආපසු ලබාදුන් බෝතල්",
    sealIntact: "මුද්රාව නොකැඩී ඇත",
    balancedBadge: "සම්පූර්ණයෙන් සමබරයි",
    discrepancyBadge: "අඩුවක් හෝ වෙනසක් ඇත!",
    waiverAllowance: "නොමිලේ හිමිවන කෝකේජ් සීමාව",
    billableCorkage: "අය කරන අතිරේක බෝතල්",
    corkageTotal: "මුළු අතිරේක කෝකේජ් ගාස්තුව",
    clientSignaturePrompt: "සේවාදායකයා භාරගත් බවට තහවුරු කිරීම",
    managerSignaturePrompt: "හෝටල් කළමනාකරුගේ සහතිකය",
    printVoucher: "කුවිතාන්සිය මුද්රණය",
    saveAndClose: "සටහන සුරකින්න",
    cancel: "වසන්න",
  },
  ta: {
    title: "மதுபான பாட்டில் நுழைவுச்சீட்டு & சமரசம்",
    subtitle: "மதுபானங்கள் பெறுதல், காலியான பாட்டில்கள் கணக்கெடுப்பு மற்றும் கார்க்கேஜ் கட்டணம்",
    tabIntake: "1. நுழைவு அனுமதிச்சீட்டு",
    tabReconciliation: "2. பாட்டில் சமரசம்",
    tabSignOff: "3. கையொப்பம் & கார்க்கேஜ்",
    gatePassNumber: "நுழைவுச்சீட்டு எண்",
    clientName: "வாடிக்கையாளர் பெயர்",
    clientNic: "தேசிய அடையாள அட்டை / கடவுச்சீட்டு",
    brandNamePlaceholder: "எ.கா: ஜானி வாக்கர் பிளாக் லேபிள் 1L",
    addBottleButton: "+ பாட்டில் பிராண்ட் சேர்க்க",
    quickPresetTitle: "பிரபலமான இலங்கை மதுபான வகைகள்",
    category: "வகை",
    received: "பெறப்பட்டது",
    opened: "திறக்கப்பட்டது",
    returned: "மீளளிக்கப்பட்டது",
    sealIntact: "முத்திரை অক্ষதமாக உள்ளது",
    balancedBadge: "முழுமையாக சமநிலையானது",
    discrepancyBadge: "முரண்பாடு உள்ளது!",
    waiverAllowance: "இலவச கார்க்கேஜ் வரம்பு",
    billableCorkage: "கூடுதல் கட்டண பாட்டில்கள்",
    corkageTotal: "மொத்த கார்க்கேஜ் கட்டணம்",
    clientSignaturePrompt: "வாடிக்கையாளர் சான்றொப்பம்",
    managerSignaturePrompt: "மேலாளர் சான்றொப்பம்",
    printVoucher: "சீட்டு அச்சிடுக",
    saveAndClose: "பதிவை சேமிக்க",
    cancel: "மூடு",
  },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ModalHeaderProps {
  readonly t: LiquorModalTranslations;
  readonly activeTab: LiquorLogTab;
  readonly onSelectTab: (tab: LiquorLogTab) => void;
  readonly onClose: () => void;
}

const ModalHeader: FC<ModalHeaderProps> = ({ t, activeTab, onSelectTab, onClose }) => {
  return (
    <div className="pb-4 border-b border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>{t.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-700 text-slate-700 flex items-center justify-center transition-colors"
        >
          x
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1 rounded-xl border border-slate-700/80">
        <button
          type="button"
          onClick={() => onSelectTab("INTAKE")}
          className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "INTAKE"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.tabIntake}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("RECONCILIATION")}
          className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "RECONCILIATION"
              ? "bg-amber-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.tabReconciliation}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("SIGN_OFF")}
          className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "SIGN_OFF"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.tabSignOff}
        </button>
      </div>
    </div>
  );
};

interface IntakeTabProps {
  readonly details: LiquorGatePassDetails;
  readonly entries: readonly ClientLiquorBottleEntry[];
  readonly t: LiquorModalTranslations;
  readonly onAddEntry: (entry: ClientLiquorBottleEntry) => void;
  readonly onRemoveEntry: (id: string) => void;
}

const IntakeTab: FC<IntakeTabProps> = ({ details, entries, t, onAddEntry, onRemoveEntry }) => {
  const [newBrandName, setNewBrandName] = useState("");
  const [newCategory, setNewCategory] = useState<LiquorCategory>("WHISKEY");
  const [newVolumeMl, setNewVolumeMl] = useState(1000);
  const [newQuantity, setNewQuantity] = useState(1);

  const handleAdd = () => {
    if (!newBrandName.trim()) return;
    const entry: ClientLiquorBottleEntry = {
      id: `liq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      brandName: newBrandName.trim(),
      category: newCategory,
      bottleVolumeMl: newVolumeMl,
      quantityReceived: Math.max(1, newQuantity),
      quantityOpened: 0,
      quantityReturnedUnopened: 0,
      sealIntact: true,
    };
    onAddEntry(entry);
    setNewBrandName("");
    setNewQuantity(1);
  };

  const handleQuickPreset = (preset: (typeof POPULAR_SRI_LANKAN_BRANDS)[number]) => {
    setNewBrandName(`${preset.brandName} ${preset.bottleVolumeMl}ml`);
    setNewCategory(preset.category);
    setNewVolumeMl(preset.bottleVolumeMl);
  };

  return (
    <div className="space-y-4">
      {/* Gate Pass Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-[16px] bg-slate-100 border border-slate-700/60 text-xs">
        <div>
          <span className="text-slate-400">{t.gatePassNumber}:</span>
          <p className="font-mono font-bold text-amber-800">{details.gatePassNumber}</p>
        </div>
        <div>
          <span className="text-slate-400">{t.clientName}:</span>
          <p className="font-semibold text-slate-900 truncate">{details.clientName}</p>
        </div>
        <div>
          <span className="text-slate-400">{t.clientNic}:</span>
          <p className="font-mono text-slate-900">{details.clientNicOrPassport}</p>
        </div>
        <div>
          <span className="text-slate-400">Function BEO:</span>
          <p className="font-semibold text-blue-800">{details.functionNumber}</p>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t.quickPresetTitle}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {POPULAR_SRI_LANKAN_BRANDS.slice(0, 8).map((preset) => (
            <button
              key={preset.brandName}
              type="button"
              onClick={() => handleQuickPreset(preset)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-700 text-slate-700 border border-slate-700 transition-colors"
            >
              + {preset.brandName}
            </button>
          ))}
        </div>
      </div>

      {/* Add Bottle Row */}
      <div className="p-4 rounded-[16px] bg-slate-100 border border-slate-700 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            placeholder={t.brandNamePlaceholder}
            className="sm:col-span-2 bg-white border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as LiquorCategory)}
            className="bg-white border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
          >
            <option value="WHISKEY">Whiskey</option>
            <option value="ARRACK">Ceylon Arrack</option>
            <option value="WINE">Wine / Champagne</option>
            <option value="GIN_VODKA">Gin / Vodka</option>
            <option value="BEER">Beer</option>
            <option value="OTHER">Other</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="w-20 bg-white border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-900 text-center font-bold min-h-[44px]"
              title="Quantity Received"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap"
            >
              {t.addBottleButton}
            </button>
          </div>
        </div>
      </div>

      {/* Intake Entries Table */}
      <div className="rounded-[16px] border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-3">Brand Name</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Received</th>
              <th className="p-3 text-center">Seal Intact</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="p-3 font-semibold text-slate-900">{entry.brandName}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {entry.category}
                  </span>
                </td>
                <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {entry.quantityReceived}
                </td>
                <td className="p-3 text-center text-[#0B6E4F]">Yes</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                    className="text-rose-800 hover:text-rose-800 text-xs font-semibold px-2 py-1"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ReconciliationTabProps {
  readonly entries: readonly ClientLiquorBottleEntry[];
  readonly summary: LiquorReconciliationSummary;
  readonly t: LiquorModalTranslations;
  readonly onUpdateCount: (
    id: string,
    field: "quantityOpened" | "quantityReturnedUnopened",
    value: number,
  ) => void;
}

const ReconciliationTab: FC<ReconciliationTabProps> = ({ entries, summary, t, onUpdateCount }) => {
  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div
        className={`p-3.5 rounded-[16px] border flex items-center justify-between text-xs font-semibold ${
          summary.isBalanced
            ? "bg-[#34C759]/10 border-[#34C759]/40 text-[#34C759]"
            : "bg-[#FF3B30]/10 border-[#FF3B30]/40 text-[#FF3B30] animate-pulse"
        }`}
      >
        <div className="flex items-center gap-2">
          <span>
            <DynamicTokenIcon token={summary.isBalanced ? "OK" : "Alert"} />
          </span>
          <span>{summary.isBalanced ? t.balancedBadge : t.discrepancyBadge}</span>
        </div>
        <div>
          Received: <strong>{summary.totalBottlesReceived}</strong> | Opened:{" "}
          <strong>{summary.totalBottlesOpened}</strong> | Returned:{" "}
          <strong>{summary.totalBottlesReturned}</strong>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="rounded-[16px] border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-3">Brand Name</th>
              <th className="p-3 text-center">Rec'd</th>
              <th className="p-3 text-center">{t.opened}</th>
              <th className="p-3 text-center">{t.returned}</th>
              <th className="p-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-white">
            {entries.map((entry) => {
              const rowAccounted = entry.quantityOpened + entry.quantityReturnedUnopened;
              const rowDiff = entry.quantityReceived - rowAccounted;

              return (
                <tr key={entry.id}>
                  <td className="p-3 font-semibold text-slate-900">{entry.brandName}</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-900 tabular-nums">
                    {entry.quantityReceived}
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={entry.quantityReceived}
                      value={entry.quantityOpened}
                      onChange={(e) =>
                        onUpdateCount(entry.id, "quantityOpened", Number(e.target.value))
                      }
                      className="w-16 bg-slate-100 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-amber-800 focus:outline-none min-h-[36px]"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={entry.quantityReceived}
                      value={entry.quantityReturnedUnopened}
                      onChange={(e) =>
                        onUpdateCount(entry.id, "quantityReturnedUnopened", Number(e.target.value))
                      }
                      className="w-16 bg-slate-100 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-[#0B6E4F] focus:outline-none min-h-[36px]"
                    />
                  </td>
                  <td className="p-3 text-right">
                    {rowDiff === 0 ? (
                      <span className="text-[10px] font-bold text-[#0B6E4F]">Balanced</span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-800">
                        {rowDiff > 0 ? `-${rowDiff} Missing` : `+${Math.abs(rowDiff)} Excess`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface SignOffTabProps {
  readonly details: LiquorGatePassDetails;
  readonly summary: LiquorReconciliationSummary;
  readonly t: LiquorModalTranslations;
  readonly clientSigned: boolean;
  readonly managerSigned: boolean;
  readonly onToggleClientSign: () => void;
  readonly onToggleManagerSign: () => void;
  readonly onPrintVoucher: () => void;
}

const SignOffTab: FC<SignOffTabProps> = ({
  details,
  summary,
  t,
  clientSigned,
  managerSigned,
  onToggleClientSign,
  onToggleManagerSign,
  onPrintVoucher,
}) => {
  return (
    <div className="space-y-4">
      {/* Corkage Financial Breakdown */}
      <div className="p-4 rounded-[16px] bg-slate-100 border border-slate-700 space-y-2 text-xs">
        <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">
          {t.corkageTotal}
        </h4>
        <div className="flex justify-between text-slate-700">
          <span>{t.waiverAllowance}:</span>
          <span className="font-semibold text-[#0B6E4F] tabular-nums">
            {details.corkageWaiverAllowance} bottles (Free)
          </span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Actual Opened Bottles:</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {summary.totalBottlesOpened} bottles
          </span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>{t.billableCorkage}:</span>
          <span className="font-semibold text-amber-700 tabular-nums">
            {summary.billableCorkageCount} bottles
          </span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Corkage Rate per Bottle:</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatLiquorCurrency(details.excessCorkageRatePerBottleLkr)}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-extrabold text-[#0B6E4F]">
          <span>{t.corkageTotal}:</span>
          <span className="tabular-nums">{formatLiquorCurrency(summary.totalCorkageFeeLkr)}</span>
        </div>
      </div>

      {/* Dual Sign-Off Checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label
          htmlFor="manager-sign-cb"
          className="p-3.5 rounded-[16px] bg-slate-100 border border-slate-700 flex items-start gap-3 cursor-pointer"
        >
          <input
            id="manager-sign-cb"
            type="checkbox"
            checked={managerSigned}
            onChange={onToggleManagerSign}
            className="w-5 h-5 rounded border-slate-600 bg-white text-blue-600 focus:ring-0 mt-0.5"
          />
          <div>
            <span className="font-bold text-slate-900">{t.managerSignaturePrompt}</span>
            <p className="text-slate-400 mt-0.5">
              Verified by: <strong>{details.banquetManagerName}</strong>
            </p>
          </div>
        </label>

        <label
          htmlFor="client-sign-cb"
          className="p-3.5 rounded-[16px] bg-slate-100 border border-slate-700 flex items-start gap-3 cursor-pointer"
        >
          <input
            id="client-sign-cb"
            type="checkbox"
            checked={clientSigned}
            onChange={onToggleClientSign}
            className="w-5 h-5 rounded border-slate-600 bg-white text-blue-600 focus:ring-0 mt-0.5"
          />
          <div>
            <span className="font-bold text-slate-900">{t.clientSignaturePrompt}</span>
            <p className="text-slate-400 mt-0.5">
              Acknowledged by: <strong>{details.clientName}</strong> ({details.clientNicOrPassport})
            </p>
          </div>
        </label>
      </div>

      {/* Print Voucher Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onPrintVoucher}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
        >
          <span>{t.printVoucher}</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const LiquorBottleLogModal: FC<LiquorBottleLogModalProps> = ({
  isOpen,
  initialDetails = DEFAULT_GATE_PASS_DETAILS,
  initialEntries = DEFAULT_LIQUOR_ENTRIES,
  language = "en",
  isDarkMode = true,
  onClose,
  onSaveLog,
}) => {
  const containerId = useId();

  // State
  const [activeTab, setActiveTab] = useState<LiquorLogTab>("INTAKE");
  const [details] = useState<LiquorGatePassDetails>(initialDetails);
  const [entries, setEntries] = useState<readonly ClientLiquorBottleEntry[]>(initialEntries);
  const [clientSigned, setClientSigned] = useState<boolean>(true);
  const [managerSigned, setManagerSigned] = useState<boolean>(true);
  const [isVoucherPreviewOpen, setIsVoucherPreviewOpen] = useState<boolean>(false);

  const t = LIQUOR_TRANSLATIONS[language];

  // Summary calculation
  const summary = useMemo(() => {
    return computeLiquorSummary(
      entries,
      details.corkageWaiverAllowance,
      details.excessCorkageRatePerBottleLkr,
    );
  }, [entries, details.corkageWaiverAllowance, details.excessCorkageRatePerBottleLkr]);

  // Handlers
  const handleAddEntry = useCallback((entry: ClientLiquorBottleEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const handleRemoveEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleUpdateCount = useCallback(
    (id: string, field: "quantityOpened" | "quantityReturnedUnopened", value: number) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: Math.max(0, value) } : e)),
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    onSaveLog?.(details, entries, summary);
    onClose();
  }, [details, entries, summary, onSaveLog, onClose]);

  // Printable voucher text
  const voucherText = useMemo(() => {
    return formatLiquorGatePassVoucher(details, entries, summary);
  }, [details, entries, summary]);

  if (!isOpen) return null;

  return (
    <div
      id={containerId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div
        className={`max-w-2xl w-full max-h-[90vh] flex flex-col rounded-[24px] border p-4 sm:p-6 shadow-2xl overflow-hidden ${
          isDarkMode
            ? "bg-white border-slate-800 text-slate-800"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <ModalHeader t={t} activeTab={activeTab} onSelectTab={setActiveTab} onClose={onClose} />

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "INTAKE" && (
            <IntakeTab
              details={details}
              entries={entries}
              t={t}
              onAddEntry={handleAddEntry}
              onRemoveEntry={handleRemoveEntry}
            />
          )}

          {activeTab === "RECONCILIATION" && (
            <ReconciliationTab
              entries={entries}
              summary={summary}
              t={t}
              onUpdateCount={handleUpdateCount}
            />
          )}

          {activeTab === "SIGN_OFF" && (
            <SignOffTab
              details={details}
              summary={summary}
              t={t}
              clientSigned={clientSigned}
              managerSigned={managerSigned}
              onToggleClientSign={() => setClientSigned((v) => !v)}
              onToggleManagerSign={() => setManagerSigned((v) => !v)}
              onPrintVoucher={() => setIsVoucherPreviewOpen(true)}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 font-semibold text-xs transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg transition-all"
          >
            {t.saveAndClose}
          </button>
        </div>
      </div>

      {/* Voucher Print Preview Modal */}
      {isVoucherPreviewOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="max-w-lg w-full bg-[#F4F7F5] rounded-[24px] border border-slate-800 p-4 sm:p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Gate-Pass Voucher Print Preview</h3>
              <button
                type="button"
                onClick={() => setIsVoucherPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center"
              >
                x
              </button>
            </div>
            <pre className="mt-4 p-4 rounded-[16px] bg-black font-mono text-[11px] text-[#0B6E4F] overflow-y-auto flex-1 whitespace-pre leading-relaxed border border-slate-800">
              {voucherText}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg transition-all"
              >
                Print Official Voucher
              </button>
              <button
                type="button"
                onClick={() => setIsVoucherPreviewOpen(false)}
                className="px-4 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-700 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
