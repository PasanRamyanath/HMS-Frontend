/**
 * Order Void, Wastage & Complimentary Manager Approval Modal (VoidOrderModal.tsx)
 * Purpose-built for Sri Lankan resort restaurants, hotel bars, and room service.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - 4 Explicit authorization action modes:
 * 1. FULL_ORDER_VOID: Void entire ticket before cooking or delivery
 * 2. LINE_ITEM_VOID: Void specific individual dish(es) or beverage(s)
 * 3. KITCHEN_WASTAGE: Record kitchen spoilage, burnt/spilled items with recipe BOM stock deduction
 * 4. COMPLIMENTARY_APPROVAL: 100% GM/F&B manager courtesy meal with guest allowance
 * - Mandatory Reason Code Picker:
 * - GUEST_CHANGED_MIND_BEFORE_COOKING (Stock preserved, zero wastage)
 * - KITCHEN_SPOILAGE_DEDUCT_STOCK (BOM stock deducted, spoilage ledger)
 * - ORDER_DUPLICATION (Accidental double-punch, food not fired)
 * - QUALITY_DEFECT_SPILL (Plate dropped, foreign object, food remade)
 * - MANAGEMENT_COMPLIMENTARY (VIP / guest relations courtesy)
 * - OTHER (Mandatory explanation required)
 * - Touch-First Apple-Styled Manager PIN Numeric Keypad (>= 44x44pt buttons)
 * - Masked PIN dot indicators with error shake feedback
 * - Instant manager role & identity verification (e.g. "Nuwan Silva — F&B Director")
 * - Automatic Room Folio Charge Reversal:
 * - For room-charged orders, reverses the folio charge with compounding 4-stage taxes
 * - Trilingual Localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
 type PosCartItem,
 type PosOrderType,
 type PosTaxSummary,
 calculatePosTaxSummary,
 formatLkr,
} from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type VoidActionType =
 | "FULL_ORDER_VOID"
 | "LINE_ITEM_VOID"
 | "KITCHEN_WASTAGE"
 | "COMPLIMENTARY_APPROVAL";

export type VoidReasonCode =
 | "GUEST_CHANGED_MIND_BEFORE_COOKING"
 | "KITCHEN_SPOILAGE_DEDUCT_STOCK"
 | "ORDER_DUPLICATION"
 | "QUALITY_DEFECT_SPILL"
 | "MANAGEMENT_COMPLIMENTARY"
 | "OTHER";

export type InventoryImpactMode =
 | "STOCK_PRESERVED"
 | "STOCK_DEDUCTED_WASTAGE"
 | "STOCK_DEDUCTED_COMP";

export interface AuthorizedManager {
 readonly id: string;
 readonly name: string;
 readonly roleTitle: string;
 readonly pin: string;
}

export interface VoidedItemSummary {
 readonly itemId: string;
 readonly name: string;
 readonly quantityVoided: number;
 readonly unitPriceLkr: number;
 readonly totalBaseLkr: number;
}

export interface VoidOrderPayload {
 readonly orderId: string;
 readonly destination: string;
 readonly actionType: VoidActionType;
 readonly reasonCode: VoidReasonCode;
 readonly customReasonNote?: string | undefined;
 readonly managerId: string;
 readonly managerName: string;
 readonly managerRoleTitle: string;
 readonly inventoryImpact: InventoryImpactMode;
 readonly itemsVoided: readonly VoidedItemSummary[];
 readonly totalBaseVoidedLkr: number;
 readonly taxReversal: PosTaxSummary;
 readonly totalReversedLkr: number;
 readonly reverseFolioCharge: boolean;
 readonly timestampIso: string;
}

export interface VoidOrderModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly orderId: string;
 readonly destination: string; // Table number or Room number
 readonly orderItems: readonly PosCartItem[];
 readonly orderType?: PosOrderType | undefined;
 readonly isChargedToRoom?: boolean | undefined;
 readonly guestRoomNumber?: string | undefined;
 readonly initialActionType?: VoidActionType | undefined;
 readonly authorizedManagers?: readonly AuthorizedManager[] | undefined;
 readonly onConfirmVoid: (payload: VoidOrderPayload) => void;
 readonly language?: SupportedLanguage | undefined;
 readonly usdExchangeRate?: number | undefined;
}

export interface VoidReasonDetails {
 readonly code: VoidReasonCode;
 readonly labelEn: string;
 readonly labelSi: string;
 readonly labelTa: string;
 readonly descriptionEn: string;
 readonly defaultImpact: InventoryImpactMode;
}

// ============================================================================
// Constants & Authorized Demo Managers
// ============================================================================

export const DEFAULT_AUTHORIZED_MANAGERS: readonly AuthorizedManager[] = [
 {
 id: "mgr-001",
 name: "Nuwan Silva",
 roleTitle: "F&B Director",
 pin: "9944",
 },
 {
 id: "mgr-002",
 name: "Chaminda Fernando",
 roleTitle: "Executive Head Chef",
 pin: "1234",
 },
 {
 id: "mgr-003",
 name: "Priyani Jayawardena",
 roleTitle: "General Manager",
 pin: "8821",
 },
];

export const VOID_REASON_CATALOG: readonly VoidReasonDetails[] = [
 {
 code: "GUEST_CHANGED_MIND_BEFORE_COOKING",
 labelEn: "Guest Changed Mind (Before Cooking)",
 labelSi: "ආහාර පිසීමට පෙර අමුත්තා තීරණය වෙනස් කළේය",
 labelTa: "சமைப்பதற்கு முன் விருந்தினர் மனதை மாற்றினார்",
 descriptionEn:
 "Preparation was halted before kitchen fire. Zero inventory loss; ingredients preserved.",
 defaultImpact: "STOCK_PRESERVED",
 },
 {
 code: "KITCHEN_SPOILAGE_DEDUCT_STOCK",
 labelEn: "Kitchen Spoilage / Burnt Dish",
 labelSi: "මුළුතැන්ගෙයි හානිය / දැවී ගිය ආහාරය",
 labelTa: "சமையலறை வீணடிப்பு / எரிந்த உணவு",
 descriptionEn:
 "Overcooked, dropped, or spoiled during prep. Recipe BOM raw materials deducted as kitchen loss.",
 defaultImpact: "STOCK_DEDUCTED_WASTAGE",
 },
 {
 code: "ORDER_DUPLICATION",
 labelEn: "Accidental Order Duplication",
 labelSi: "අත්වැරදීමකින් දෙවරක් ඇතුළත් විය",
 labelTa: "தவறுதலாக இரட்டிப்பாக பதிவு செய்யப்பட்டது",
 descriptionEn: "Ticket punched twice in error on POS or KDS terminal. Food not cooked twice.",
 defaultImpact: "STOCK_PRESERVED",
 },
 {
 code: "QUALITY_DEFECT_SPILL",
 labelEn: "Quality Defect / Spilled Drink",
 labelSi: "තත්ත්ව දෝෂය / බීම හැලී යාම",
 labelTa: "தரக்குறைபாடு / சிந்திப்போன பானம்",
 descriptionEn:
 "Guest returned item due to quality complaint or beverage spilled at counter. Remade fresh.",
 defaultImpact: "STOCK_DEDUCTED_WASTAGE",
 },
 {
 code: "MANAGEMENT_COMPLIMENTARY",
 labelEn: "Management VIP / Complimentary (100% Comp)",
 labelSi: "කළමනාකාරිත්ව අනුග්රහය (නොමිලේ)",
 labelTa: "நிர்வாக சலுகை / இலவச உபசரிப்பு",
 descriptionEn: "Courtesy hospitality allowance authorized by General Manager or F&B Director.",
 defaultImpact: "STOCK_DEDUCTED_COMP",
 },
 {
 code: "OTHER",
 labelEn: "Other Operational Reason",
 labelSi: "වෙනත් මෙහෙයුම් හේතුවක්",
 labelTa: "பிற செயல்பாட்டுக் காரணம்",
 descriptionEn: "Special circumstance requiring explicit written audit note.",
 defaultImpact: "STOCK_PRESERVED",
 },
];

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Retrieves the descriptive metadata for a given void reason.
 */
export function getReasonDetails(code: VoidReasonCode): VoidReasonDetails {
 const match = VOID_REASON_CATALOG.find((item) => item.code === code);
 return (
 match ?? {
 code,
 labelEn: "Unknown Reason",
 labelSi: "නොදන්නා හේතුවක්",
 labelTa: "தெரியாத காரணம்",
 descriptionEn: "Operational discrepancy.",
 defaultImpact: "STOCK_PRESERVED",
 }
 );
}

/**
 * Determines inventory impact mode based on selected action and reason.
 */
export function determineInventoryImpact(
 actionType: VoidActionType,
 reason: VoidReasonCode,
): InventoryImpactMode {
 if (actionType === "COMPLIMENTARY_APPROVAL") {
 return "STOCK_DEDUCTED_COMP";
 }
 if (actionType === "KITCHEN_WASTAGE") {
 return "STOCK_DEDUCTED_WASTAGE";
 }
 return getReasonDetails(reason).defaultImpact;
}

/**
 * Calculates 4-stage tax reversal for voided items.
 */
export function calculateVoidTaxReversal(
 totalBaseLkr: number,
 orderType: PosOrderType = "DINE_IN",
 usdExchangeRate = 310,
): PosTaxSummary {
 return calculatePosTaxSummary(totalBaseLkr, orderType, usdExchangeRate);
}

/**
 * Processes PIN keypad button presses.
 */
export function processPinKeypress(currentPin: string, key: string): string {
 if (key === "CLEAR") return "";
 if (key === "DEL") return currentPin.slice(0, -1);
 if (currentPin.length < 4) return currentPin + key;
 return currentPin;
}

/**
 * Returns header badge CSS class based on action type.
 */
export function getHeaderBadgeStyle(actionType: VoidActionType): string {
 if (actionType === "COMPLIMENTARY_APPROVAL") {
 return "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30";
 }
 if (actionType === "KITCHEN_WASTAGE") {
 return "bg-amber-500/20 text-amber-700 border border-amber-500/30";
 }
 return "bg-rose-500/20 text-rose-800 border border-rose-500/30";
}

/**
 * Returns submit button CSS class based on action type.
 */
export function getConfirmButtonStyle(actionType: VoidActionType): string {
 if (actionType === "COMPLIMENTARY_APPROVAL") {
 return "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20";
 }
 if (actionType === "KITCHEN_WASTAGE") {
 return "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20";
 }
 return "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20";
}

/**
 * Resolves initial default reason code for an action type.
 */
export function getDefaultReasonForAction(actionType: VoidActionType): VoidReasonCode {
 if (actionType === "COMPLIMENTARY_APPROVAL") return "MANAGEMENT_COMPLIMENTARY";
 if (actionType === "KITCHEN_WASTAGE") return "KITCHEN_SPOILAGE_DEDUCT_STOCK";
 return "GUEST_CHANGED_MIND_BEFORE_COOKING";
}

/**
 * Returns localized button text for confirmation.
 */
export function getConfirmButtonLabel(
 actionType: VoidActionType,
 t: VoidModalTranslations,
): string {
 if (actionType === "COMPLIMENTARY_APPROVAL") return t.confirmComp;
 if (actionType === "KITCHEN_WASTAGE") return t.confirmWastage;
 return t.confirmVoid;
}

/**
 * Verifies a 4-digit PIN against the list of authorized managers.
 */
export function verifyManagerPin(
 pin: string,
 managers: readonly AuthorizedManager[] = DEFAULT_AUTHORIZED_MANAGERS,
): AuthorizedManager | null {
 if (pin.length !== 4) return null;
 return managers.find((mgr) => mgr.pin === pin) ?? null;
}

/**
 * Validates whether the void request is ready for submission.
 */
export function validateVoidSubmission(params: {
 readonly actionType: VoidActionType;
 readonly reasonCode: VoidReasonCode;
 readonly customReasonNote?: string | undefined;
 readonly manager: AuthorizedManager | null;
 readonly itemsVoidedCount: number;
}): { readonly isValid: boolean; readonly errorMessage?: string | undefined } {
 if (!params.manager) {
 return {
 isValid: false,
 errorMessage: "Valid 4-digit Manager PIN required for authorization.",
 };
 }
 if (params.itemsVoidedCount <= 0) {
 return {
 isValid: false,
 errorMessage: "At least one item must be selected for void/wastage.",
 };
 }
 if (
 params.reasonCode === "OTHER" &&
 (!params.customReasonNote || params.customReasonNote.trim().length < 5)
 ) {
 return {
 isValid: false,
 errorMessage: "Detailed note (minimum 5 chars) is mandatory when selecting 'Other'.",
 };
 }
 return { isValid: true };
}

// ============================================================================
// Translations Dictionary
// ============================================================================

export interface VoidModalTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly actionType: string;
 readonly fullVoid: string;
 readonly lineVoid: string;
 readonly wastage: string;
 readonly comp: string;
 readonly itemsToVoid: string;
 readonly reasonTitle: string;
 readonly pinTitle: string;
 readonly pinPlaceholder: string;
 readonly authorizedBy: string;
 readonly customNoteLabel: string;
 readonly customNotePlaceholder: string;
 readonly stockPreservedNotice: string;
 readonly stockWastageNotice: string;
 readonly stockCompNotice: string;
 readonly folioReversalNotice: string;
 readonly cancel: string;
 readonly confirmVoid: string;
 readonly confirmComp: string;
 readonly confirmWastage: string;
 readonly clear: string;
 readonly del: string;
 readonly invalidPin: string;
 readonly baseSubtotal: string;
 readonly taxReversal: string;
 readonly totalReversed: string;
}

const TRANSLATIONS: Record<SupportedLanguage, VoidModalTranslations> = {
 en: {
 title: "Order Void & Spoilage Approval",
 subtitle: "Manager Authorization & Stock Wastage Protocol",
 actionType: "Authorization Type",
 fullVoid: "Void Full Order",
 lineVoid: "Void Selected Items",
 wastage: "Kitchen Spoilage",
 comp: "Complimentary (Comp)",
 itemsToVoid: "Items to Void / Spoil",
 reasonTitle: "Mandatory Reason Code",
 pinTitle: "Manager 4-Digit Security PIN",
 pinPlaceholder: "Enter 4-digit PIN",
 authorizedBy: "Authorized by:",
 customNoteLabel: "Explanation Note (Mandatory for 'Other')",
 customNotePlaceholder: "Specify exact reason for audit ledger...",
 stockPreservedNotice: "Stock Preserved: Food not cooked; raw inventory intact.",
 stockWastageNotice: "Stock Deducted: Ingredients deducted from stock as kitchen spoilage.",
 stockCompNotice: "Complimentary: Charged to House/VIP courtesy account.",
 folioReversalNotice: "Room Folio Reversal: Full charges and taxes will be credited back.",
 cancel: "Cancel",
 confirmVoid: "Approve & Process Void",
 confirmComp: "Approve Complimentary",
 confirmWastage: "Record Kitchen Spoilage",
 clear: "Clear",
 del: "Delete",
 invalidPin: "Invalid Manager PIN. Access denied.",
 baseSubtotal: "Base Subtotal",
 taxReversal: "4-Stage Tax Reversal",
 totalReversed: "Total Refund / Reversal",
 },
 si: {
 title: "ඇණවුම අවලංගු කිරීම සහ නාස්තිය අනුමැතිය",
 subtitle: "කළමනාකරු අවසරය සහ තොග නාස්ති ලේඛනය",
 actionType: "අවසර වර්ගය",
 fullVoid: "මුළු ඇණවුම අවලංගු කරන්න",
 lineVoid: "තෝරාගත් අයිතම අවලංගු කරන්න",
 wastage: "මුළුතැන්ගෙයි නාස්තිය",
 comp: "නොමිලේ අනුග්රහය (Comp)",
 itemsToVoid: "අවලංගු කරන අයිතම",
 reasonTitle: "අනිවාර්ය හේතුව",
 pinTitle: "කළමනාකරුගේ 4-ඉලක්කම් PIN අංකය",
 pinPlaceholder: "PIN අංකය ඇතුළත් කරන්න",
 authorizedBy: "අනුමත කළේ:",
 customNoteLabel: "විස්තර සටහන ('වෙනත්' සඳහා අනිවාර්යයි)",
 customNotePlaceholder: "විගණන ලේඛනය සඳහා නිශ්චිත හේතුව සඳහන් කරන්න...",
 stockPreservedNotice: "තොගය සුරැකිණි: ආහාර පිස නැත; අමුද්රව්ය සංචිතය නොවෙනස්ව පවතී.",
 stockWastageNotice: "තොගයෙන් අඩු කෙරේ: අමුද්රව්ය නාස්තියක් ලෙස ගණනය කෙරේ.",
 stockCompNotice: "නොමිලේ අනුග්රහය: හෝටල් අනුග්රහ ගිණුමට හර කෙරේ.",
 folioReversalNotice: "කාමර බිල්පත ආපසු හැරවීම: සියලු බදු සමඟ මුදල ආපසු බැර වේ.",
 cancel: "අවලංගු කරන්න",
 confirmVoid: "අවලංගු කිරීම අනුමත කරන්න",
 confirmComp: "නොමිලේ දීමනාව අනුමත කරන්න",
 confirmWastage: "නාස්තිය සටහන් කරන්න",
 clear: "මකන්න",
 del: "ඉවත් කරන්න",
 invalidPin: "වැරදි PIN අංකයකි. අවසර නැත.",
 baseSubtotal: "මූලික එකතුව",
 taxReversal: "4-අදියර බදු ආපසු හැරවීම",
 totalReversed: "මුළු ආපසු මුදල",
 },
 ta: {
 title: "ஆர்டர் ரத்து மற்றும் வீணடிப்பு ஒப்புதல்",
 subtitle: "மேலாளர் அங்கீகாரம் மற்றும் சரக்கு வீணடிப்பு நெறிமுறை",
 actionType: "அங்கீகார வகை",
 fullVoid: "முழு ஆர்டரையும் ரத்து செய்",
 lineVoid: "தேர்ந்தெடுத்த உருப்படிகளை ரத்து செய்",
 wastage: "சமையலறை வீணடிப்பு",
 comp: "இலவச உபசரிப்பு (Comp)",
 itemsToVoid: "ரத்து செய்ய வேண்டிய உருப்படிகள்",
 reasonTitle: "கட்டாயக் காரணம்",
 pinTitle: "மேலாளரின் 4-இலக்க பாதுகாப்பு பின்",
 pinPlaceholder: "4-இலக்க பின்னை உள்ளிடவும்",
 authorizedBy: "அங்கீகரித்தவர்:",
 customNoteLabel: "விளக்கக் குறிப்பு ('பிற' காரணத்திற்கு கட்டாயம்)",
 customNotePlaceholder: "தணிக்கைக்காக விரிவான காரணத்தைக் குறிப்பிடவும்...",
 stockPreservedNotice: "சரக்கு பாதுகாக்கப்பட்டது: உணவு சமைக்கப்படவில்லை.",
 stockWastageNotice: "சரக்கிலிருந்து கழிக்கப்பட்டது: சமையலறை இழப்பாக பதிவு செய்யப்பட்டது.",
 stockCompNotice: "இலவச உபசரிப்பு: விருந்தோம்பல் கணக்கில் சேர்க்கப்பட்டது.",
 folioReversalNotice: "அறை கட்டண ரத்து: அனைத்து வரிகளுடன் தொகை திரும்ப வரவு வைக்கப்படும்.",
 cancel: "ரத்து செய்",
 confirmVoid: "ரத்து செய்ய ஒப்புதல் அளி",
 confirmComp: "இலவசத்தை உறுதி செய்",
 confirmWastage: "வீணடிப்பைப் பதிவு செய்",
 clear: "அழி",
 del: "நீக்கு",
 invalidPin: "தவறான பின் எண். அனுமதி மறுக்கப்பட்டது.",
 baseSubtotal: "அடிப்படைத் தொகை",
 taxReversal: "4-நிலை வரி ரத்து",
 totalReversed: "மொத்த திரும்பளிப்புத் தொகை",
 },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 10)
// ============================================================================

interface ActionModeSwitcherProps {
 readonly actionType: VoidActionType;
 readonly onSelectAction: (mode: VoidActionType) => void;
 readonly t: VoidModalTranslations;
}

const ActionModeSwitcher: FC<ActionModeSwitcherProps> = ({ actionType, onSelectAction, t }) => (
 <div>
 <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
 {t.actionType}
 </span>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F4F7F5] p-1.5 rounded-2xl border border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onSelectAction("FULL_ORDER_VOID")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 actionType === "FULL_ORDER_VOID"
 ? "bg-rose-500 text-white shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 {t.fullVoid}
 </button>
 <button
 type="button"
 onClick={() => onSelectAction("LINE_ITEM_VOID")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 actionType === "LINE_ITEM_VOID"
 ? "bg-rose-500 text-white shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 {t.lineVoid}
 </button>
 <button
 type="button"
 onClick={() => onSelectAction("KITCHEN_WASTAGE")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 actionType === "KITCHEN_WASTAGE"
 ? "bg-amber-500 text-slate-950 shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 {t.wastage}
 </button>
 <button
 type="button"
 onClick={() => onSelectAction("COMPLIMENTARY_APPROVAL")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 actionType === "COMPLIMENTARY_APPROVAL"
 ? "bg-emerald-500 text-slate-950 shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 {t.comp}
 </button>
 </div>
 </div>
);

interface LineItemChecklistProps {
 readonly orderItems: readonly PosCartItem[];
 readonly quantities: Record<string, number>;
 readonly onAdjustQty: (itemId: string, delta: number, maxQty: number) => void;
 readonly label: string;
}

const LineItemChecklist: FC<LineItemChecklistProps> = ({
 orderItems,
 quantities,
 onAdjustQty,
 label,
}) => (
 <div className="bg-[#F4F7F5] rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
 <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
 {label}
 </span>
 <div className="divide-y divide-slate-200">
 {orderItems.map((item) => {
 const qty = quantities[item.id] ?? 0;
 return (
 <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
 <div className="flex-1 min-w-0 pr-3">
 <span className="font-medium text-slate-900 block truncate">{item.name}</span>
 <span className="text-xs text-slate-400 font-mono tabular-nums-lkr">
 {formatLkr(item.unitPriceLkr)} ea
 </span>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => onAdjustQty(item.id, -1, item.quantity)}
 disabled={qty <= 0}
 className="w-9 h-9 rounded-xl bg-slate-50 disabled:opacity-30 hover:bg-slate-50 text-slate-900 font-bold flex items-center justify-center transition-colors"
 aria-label={`Decrease ${item.name}`}
 >
 -
 </button>
 <span className="w-8 text-center font-mono font-bold text-slate-900 text-sm">{qty}</span>
 <button
 type="button"
 onClick={() => onAdjustQty(item.id, 1, item.quantity)}
 disabled={qty >= item.quantity}
 className="w-9 h-9 rounded-xl bg-slate-50 disabled:opacity-30 hover:bg-slate-50 text-slate-900 font-bold flex items-center justify-center transition-colors"
 aria-label={`Increase ${item.name}`}
 >
 +
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
);

interface ReasonSelectorProps {
 readonly currentReason: VoidReasonCode;
 readonly onSelectReason: (code: VoidReasonCode) => void;
 readonly language: SupportedLanguage;
 readonly label: string;
}

const ReasonSelector: FC<ReasonSelectorProps> = ({
 currentReason,
 onSelectReason,
 language,
 label,
}) => (
 <div>
 <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
 {label}
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {VOID_REASON_CATALOG.map((reason) => {
 const isSelected = currentReason === reason.code;
 const reasonLabel =
 language === "si" ? reason.labelSi : language === "ta" ? reason.labelTa : reason.labelEn;

 return (
 <button
 key={reason.code}
 type="button"
 onClick={() => onSelectReason(reason.code)}
 className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
 isSelected
 ? "bg-slate-50 border-blue-500/80 text-slate-900 shadow-md ring-1 ring-blue-500/50"
 : "bg-[#F4F7F5] border-[#E2E8F0] text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 <span className="text-xs font-bold text-slate-900 block mb-1">{reasonLabel}</span>
 <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
 {reason.descriptionEn}
 </span>
 </button>
 );
 })}
 </div>
 </div>
);

interface ImpactNoticesProps {
 readonly inventoryImpact: InventoryImpactMode;
 readonly isChargedToRoom: boolean;
 readonly guestRoomNumber?: string | undefined;
 readonly destination: string;
 readonly t: VoidModalTranslations;
}

const ImpactNotices: FC<ImpactNoticesProps> = ({
 inventoryImpact,
 isChargedToRoom,
 guestRoomNumber,
 destination,
 t,
}) => {
 const impactColor =
 inventoryImpact === "STOCK_PRESERVED"
 ? "bg-blue-500/10 border-blue-500/20 text-blue-800"
 : inventoryImpact === "STOCK_DEDUCTED_WASTAGE"
 ? "bg-amber-500/10 border-amber-500/20 text-amber-800"
 : "bg-emerald-500/10 border-emerald-500/20 text-[#0B6E4F]";

 const impactTitle =
 inventoryImpact === "STOCK_PRESERVED"
 ? "Stock Preserved"
 : inventoryImpact === "STOCK_DEDUCTED_WASTAGE"
 ? "Kitchen Spoilage Ledger"
 : "Courtesy Stock Deduction";

 const impactMessage =
 inventoryImpact === "STOCK_PRESERVED"
 ? t.stockPreservedNotice
 : inventoryImpact === "STOCK_DEDUCTED_WASTAGE"
 ? t.stockWastageNotice
 : t.stockCompNotice;

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${impactColor}`}>
 <span className="font-bold block mb-1">Box {impactTitle}</span>
 {impactMessage}
 </div>

 {isChargedToRoom && (
 <div className="p-3.5 rounded-2xl border bg-purple-500/10 border-purple-500/20 text-purple-800 text-xs leading-relaxed">
 <span className="font-bold block mb-1">
 Room Folio Charge Reversal ({guestRoomNumber ?? destination})
 </span>
 {t.folioReversalNotice}
 </div>
 )}
 </div>
 );
};

interface ManagerPinKeypadProps {
 readonly pinInput: string;
 readonly pinError: boolean;
 readonly verifiedManager: AuthorizedManager | null;
 readonly onKeyPress: (key: string) => void;
 readonly t: VoidModalTranslations;
}

const ManagerPinKeypad: FC<ManagerPinKeypadProps> = ({
 pinInput,
 pinError,
 verifiedManager,
 onKeyPress,
 t,
}) => {
 const pinBorderColor = pinError
 ? "border-rose-500 animate-pulse"
 : verifiedManager
 ? "border-emerald-500"
 : "border-[#E2E8F0]";

 return (
 <div className="border-t border-[#E2E8F0] pt-5 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
 {t.pinTitle}
 </span>
 <span className="text-[11px] text-slate-400">
 Touch keypad to enter authorized manager credential
 </span>
 </div>

 {/* Masked PIN Indicators */}
 <div className="flex items-center gap-3">
 <div
 className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F7F5] border ${pinBorderColor}`}
 >
 {[0, 1, 2, 3].map((idx) => {
 const isFilled = pinInput.length > idx;
 return (
 <span
 key={idx}
 className={`w-3.5 h-3.5 rounded-full transition-all ${
 isFilled
 ? verifiedManager
 ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
 : "bg-white shadow-sm shadow-white/50"
 : "bg-slate-50"
 }`}
 />
 );
 })}
 </div>
 </div>
 </div>

 {verifiedManager && (
 <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-[#0B6E4F]">
 <span>
 OK {t.authorizedBy}{" "}
 <strong className="text-white font-semibold">{verifiedManager.name}</strong> (
 {verifiedManager.roleTitle})
 </span>
 <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-[#0B6E4F]">
 PIN OK
 </span>
 </div>
 )}

 {pinError && (
 <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800">
 Alert {t.invalidPin}
 </div>
 )}

 {/* Touch-First Numeric Keypad */}
 <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
 {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "DEL"].map((k) => (
 <button
 key={k}
 type="button"
 onClick={() => onKeyPress(k)}
 className={`min-h-[48px] rounded-2xl font-mono text-base font-bold transition-all active:scale-95 ${
 k === "CLEAR"
 ? "bg-slate-100 text-rose-800 text-xs hover:bg-slate-700"
 : k === "DEL"
 ? "bg-slate-100 text-slate-700 text-xs hover:bg-slate-700"
 : "bg-[#0B6E4F] text-white hover:bg-[#0B6E4F] active:bg-[#0B6E4F]/30"
 }`}
 >
 {k === "CLEAR" ? t.clear : k === "DEL" ? t.del : k}
 </button>
 ))}
 </div>
 </div>
 );
};

interface VoidFinancialSummaryCardProps {
 readonly t: VoidModalTranslations;
 readonly totalBaseVoidedLkr: number;
 readonly taxReversal: PosTaxSummary;
}

const VoidFinancialSummaryCard: FC<VoidFinancialSummaryCardProps> = ({
 t,
 totalBaseVoidedLkr,
 taxReversal,
}) => {
 const totalTaxesLkr =
 taxReversal.serviceChargeLkr + taxReversal.tdlLkr + taxReversal.ssclLkr + taxReversal.vatLkr;

 return (
 <div className="bg-[#F4F7F5] rounded-2xl border border-[#E2E8F0] p-4 space-y-2 font-mono text-xs">
 <div className="flex justify-between text-slate-400">
 <span>{t.baseSubtotal}</span>
 <span className="tabular-nums-lkr text-slate-900 font-medium">
 {formatLkr(totalBaseVoidedLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.taxReversal} (SC 10% + TDL 1% + SSCL 2.5% + VAT 18%)</span>
 <span className="tabular-nums-lkr text-rose-800">- {formatLkr(totalTaxesLkr)}</span>
 </div>
 <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-sm font-bold">
 <span className="text-slate-900">{t.totalReversed}</span>
 <span className="tabular-nums-lkr text-slate-900">{formatLkr(taxReversal.grandTotalLkr)}</span>
 </div>
 </div>
 );
};

interface VoidModalFooterProps {
 readonly onClose: () => void;
 readonly onSubmit: () => void;
 readonly isDisabled: boolean;
 readonly buttonStyle: string;
 readonly buttonText: string;
 readonly cancelText: string;
}

const VoidModalFooter: FC<VoidModalFooterProps> = ({
 onClose,
 onSubmit,
 isDisabled,
 buttonStyle,
 buttonText,
 cancelText,
}) => (
 <footer className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3 bg-white/[0.02]">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
 >
 {cancelText}
 </button>
 <button
 type="button"
 onClick={onSubmit}
 disabled={isDisabled}
 className={`min-h-[44px] px-6 rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-98 disabled:opacity-40 disabled:pointer-events-none ${buttonStyle}`}
 >
 {buttonText}
 </button>
 </footer>
);

// ============================================================================
// Main Component
// ============================================================================

export const VoidOrderModal: FC<VoidOrderModalProps> = ({
 isOpen,
 onClose,
 orderId,
 destination,
 orderItems,
 orderType = "DINE_IN",
 isChargedToRoom = false,
 guestRoomNumber,
 initialActionType = "FULL_ORDER_VOID",
 authorizedManagers = DEFAULT_AUTHORIZED_MANAGERS,
 onConfirmVoid,
 language = "en",
 usdExchangeRate = 310,
}) => {
 const noteId = useId();
 const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

 const [actionType, setActionType] = useState<VoidActionType>(initialActionType);
 const [reasonCode, setReasonCode] = useState<VoidReasonCode>(() =>
 getDefaultReasonForAction(initialActionType),
 );
 const [customNote, setCustomNote] = useState<string>("");

 const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<string, number>>(
 () => {
 const initial: Record<string, number> = {};
 for (const item of orderItems) {
 initial[item.id] = item.quantity;
 }
 return initial;
 },
 );

 const [pinInput, setPinInput] = useState<string>("");
 const [pinError, setPinError] = useState<boolean>(false);

 const verifiedManager = useMemo(() => {
 return verifyManagerPin(pinInput, authorizedManagers);
 }, [pinInput, authorizedManagers]);

 const inventoryImpact = useMemo(() => {
 return determineInventoryImpact(actionType, reasonCode);
 }, [actionType, reasonCode]);

 const voidedItemsList = useMemo<readonly VoidedItemSummary[]>(() => {
 if (actionType === "FULL_ORDER_VOID") {
 return orderItems.map((item) => ({
 itemId: item.id,
 name: item.name,
 quantityVoided: item.quantity,
 unitPriceLkr: item.unitPriceLkr,
 totalBaseLkr: item.unitPriceLkr * item.quantity,
 }));
 }

 const list: VoidedItemSummary[] = [];
 for (const item of orderItems) {
 const qty = selectedItemQuantities[item.id] ?? 0;
 if (qty > 0) {
 list.push({
 itemId: item.id,
 name: item.name,
 quantityVoided: qty,
 unitPriceLkr: item.unitPriceLkr,
 totalBaseLkr: item.unitPriceLkr * qty,
 });
 }
 }
 return list;
 }, [actionType, orderItems, selectedItemQuantities]);

 const totalBaseVoidedLkr = useMemo(() => {
 return voidedItemsList.reduce((acc, it) => acc + it.totalBaseLkr, 0);
 }, [voidedItemsList]);

 const taxReversal = useMemo(() => {
 return calculateVoidTaxReversal(totalBaseVoidedLkr, orderType, usdExchangeRate);
 }, [totalBaseVoidedLkr, orderType, usdExchangeRate]);

 const handleKeypadPress = (val: string) => {
 setPinError(false);
 const nextPin = processPinKeypress(pinInput, val);
 setPinInput(nextPin);
 if (nextPin.length === 4 && !verifyManagerPin(nextPin, authorizedManagers)) {
 setPinError(true);
 }
 };

 const handleQuantityAdjust = (itemId: string, delta: number, maxQty: number) => {
 setSelectedItemQuantities((prev) => {
 const current = prev[itemId] ?? 0;
 const nextVal = Math.max(0, Math.min(maxQty, current + delta));
 return { ...prev, [itemId]: nextVal };
 });
 };

 const handleSelectAction = (mode: VoidActionType) => {
 setActionType(mode);
 setReasonCode(getDefaultReasonForAction(mode));
 };

 const handleSubmit = () => {
 const validation = validateVoidSubmission({
 actionType,
 reasonCode,
 customReasonNote: customNote,
 manager: verifiedManager,
 itemsVoidedCount: voidedItemsList.length,
 });

 if (!validation.isValid || !verifiedManager) {
 setPinError(true);
 return;
 }

 const payload: VoidOrderPayload = {
 orderId,
 destination,
 actionType,
 reasonCode,
 customReasonNote: customNote ? customNote.trim() : undefined,
 managerId: verifiedManager.id,
 managerName: verifiedManager.name,
 managerRoleTitle: verifiedManager.roleTitle,
 inventoryImpact,
 itemsVoided: voidedItemsList,
 totalBaseVoidedLkr,
 taxReversal,
 totalReversedLkr: taxReversal.grandTotalLkr,
 reverseFolioCharge: isChargedToRoom,
 timestampIso: new Date().toISOString(),
 };

 onConfirmVoid(payload);
 };

 if (!isOpen) return null;

 return (
 <dialog
 open
 className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
 aria-labelledby="void-modal-title"
 >
 <div className="relative w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto apple-liquid-glass">
 {/* Top Header Bar */}
 <header className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white/[0.02]">
 <div className="flex items-center gap-3">
 <span
 className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold ${getHeaderBadgeStyle(
 actionType,
 )}`}
 >
 {actionType === "COMPLIMENTARY_APPROVAL" ? "*" : "x"}
 </span>
 <div>
 <h2 id="void-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
 {t.title}
 </h2>
 <p className="text-xs text-slate-400">
 {destination} • Ticket #{orderId}
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-50 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors"
 aria-label={t.cancel}
 >
 x
 </button>
 </header>

 {/* Content Body Grid */}
 <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
 {/* Action Mode Segmented Switcher */}
 <ActionModeSwitcher actionType={actionType} onSelectAction={handleSelectAction} t={t} />

 {/* Item Checklist & Quantity Selectors */}
 {actionType !== "FULL_ORDER_VOID" && (
 <LineItemChecklist
 orderItems={orderItems}
 quantities={selectedItemQuantities}
 onAdjustQty={handleQuantityAdjust}
 label={t.itemsToVoid}
 />
 )}

 {/* Mandatory Reason Selector */}
 <ReasonSelector
 currentReason={reasonCode}
 onSelectReason={setReasonCode}
 language={language}
 label={t.reasonTitle}
 />

 {/* Optional / Mandatory Note if 'OTHER' */}
 {reasonCode === "OTHER" && (
 <div>
 <label
 htmlFor={noteId}
 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 block"
 >
 {t.customNoteLabel}
 </label>
 <textarea
 id={noteId}
 rows={2}
 value={customNote}
 onChange={(e) => setCustomNote(e.target.value)}
 placeholder={t.customNotePlaceholder}
 className="w-full bg-[#F4F7F5] border border-amber-500/40 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
 />
 </div>
 )}

 {/* Inventory & Folio Reversal Impact Callout */}
 <ImpactNotices
 inventoryImpact={inventoryImpact}
 isChargedToRoom={isChargedToRoom}
 guestRoomNumber={guestRoomNumber}
 destination={destination}
 t={t}
 />

 {/* Financial Summary Calculation Breakdown */}
 <VoidFinancialSummaryCard
 t={t}
 totalBaseVoidedLkr={totalBaseVoidedLkr}
 taxReversal={taxReversal}
 />

 {/* Manager 4-Digit Security PIN & Keypad */}
 <ManagerPinKeypad
 pinInput={pinInput}
 pinError={pinError}
 verifiedManager={verifiedManager}
 onKeyPress={handleKeypadPress}
 t={t}
 />
 </div>

 {/* Modal Action Buttons Footer */}
 <VoidModalFooter
 onClose={onClose}
 onSubmit={handleSubmit}
 isDisabled={!verifiedManager || voidedItemsList.length === 0}
 buttonStyle={getConfirmButtonStyle(actionType)}
 buttonText={getConfirmButtonLabel(actionType, t)}
 cancelText={t.cancel}
 />
 </div>
 </dialog>
 );
};
