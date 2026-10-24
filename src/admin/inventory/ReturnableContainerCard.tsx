/**
 * Empty Gas Cylinder (Litro / Laugfs LPG) & Returnable Crate Tracker (`ReturnableContainerCard.tsx`)
 *
 * Implements Step 397 (Phase 16.22):
 * - Rung 1: Track 12.5kg / 37.5kg LPG Gas Cylinders, Beer Crates, and 19L Water Bottles (full vs empty deposits).
 * - Key Capabilities:
 * 1. Tri-State Container Lifecycle Tracking:
 * - Full in Store: Sealed, ready for kitchen/bar deployment
 * - In-Use Active: Connected to kitchen manifold, bar draft beer system, or water dispensers
 * - Empty in Yard: Depleted containers awaiting supplier truck exchange
 * 2. Supplier Deposit Capital Exposure:
 * - Calculates locked deposit balance (Total Holdings x Unit Deposit in LKR)
 * - Detects exchange deficits (when supplier delivers full cylinders without matching empties, incurring new deposit charges)
 * 3. Supported Container Categories:
 * - LPG Industrial & Commercial Cylinders (37.5kg, 12.5kg Litro / Laugfs)
 * - Returnable Glass Beer & Beverage Crates (Lion Brewery, Elephant House)
 * - 19L Bulk Mineral Water Dispenser Bottles (American Premium / Keells)
 * - 10kg CO2 Carbonation Cylinders (Draft Beer & Soda systems)
 * 4. Quick Interactive Operations:
 * - Refill Exchange: Receive full units, hand over empties, track net deposit variance
 * - Connect to Active Manifold / Station: Move from Full Store to In-Use
 * - Empty Depletion: Move from In-Use to Empty Yard
 * - Deposit Refund: Return surplus empties to supplier for deposit reimbursement
 * 5. Apple HIG & Liquid Glass UI Standard:
 * - Translucent .apple-liquid-glass surfaces
 * - Continuous squircle radii, min 44x44pt touch targets
 * - SF Pro optical typography with .tabular-nums-lkr
 * - Trilingual localizations (English, Sinhala, Tamil)
 * 6. Strict cognitive complexity <= 12 per function, zero console/debugger noise.
 */

import { type ChangeEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ContainerCategory =
 | "ALL"
 | "LPG_CYLINDER"
 | "BEVERAGE_CRATE"
 | "WATER_BOTTLE"
 | "CO2_CYLINDER";

export type ContainerBrand =
 | "LITRO"
 | "LAUGFS"
 | "LION_BREWERY"
 | "AMERICAN_PREMIUM"
 | "CEYLON_BEVERAGE";

export type ContainerMovementType =
 | "REFILL_EXCHANGE"
 | "CONNECT_IN_USE"
 | "EMPTY_DEPLETED"
 | "DEPOSIT_REFUND";

export interface ContainerInventoryItem {
 readonly id: string;
 readonly tenantId: string;
 readonly name: string;
 readonly category: ContainerCategory;
 readonly brand: ContainerBrand;
 readonly supplierName: string;
 readonly depositPerUnitLkr: number;
 readonly fullInStore: number;
 readonly inUseActive: number;
 readonly emptyAwaitingExchange: number;
 readonly totalHoldings: number;
 readonly totalDepositValueLkr: number;
 readonly reorderThresholdEmpties: number;
 readonly location: string;
 readonly lastExchangeDate: string;
}

export interface ContainerTransactionRecord {
 readonly id: string;
 readonly containerId: string;
 readonly containerName: string;
 readonly movementType: ContainerMovementType;
 readonly quantity: number;
 readonly emptiesExchanged: number;
 readonly depositVarianceLkr: number;
 readonly recordedBy: string;
 readonly timestamp: string;
 readonly notes?: string | undefined;
}

export interface ContainerSummaryTotals {
 readonly totalHoldingUnits: number;
 readonly totalFullInStore: number;
 readonly totalInUseActive: number;
 readonly totalEmptiesAwaiting: number;
 readonly totalDepositCapitalLkr: number;
 readonly exchangeAlertCount: number;
}

export interface ContainerMovementInput {
 readonly movementType: ContainerMovementType;
 readonly fullReceived: number;
 readonly emptiesReturned: number;
 readonly recordedBy: string;
 readonly notes?: string | undefined;
}

// ============================================================================
// Pure Math & Utility Helpers
// ============================================================================

export function formatContainerLkr(amount: number): string {
 return `Rs. ${Number(amount).toLocaleString("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}`;
}

export function calculateExchangeDepositVariance(
 fullReceived: number,
 emptiesReturned: number,
 depositPerUnitLkr: number,
): {
 deficitCount: number;
 surplusCount: number;
 netDepositChargeLkr: number;
 isBalanced: boolean;
} {
 const safeFull = Math.max(0, fullReceived);
 const safeEmpty = Math.max(0, emptiesReturned);
 const safeDeposit = Math.max(0, depositPerUnitLkr);

 const diff = safeFull - safeEmpty;
 const deficitCount = diff > 0 ? diff : 0;
 const surplusCount = diff < 0 ? Math.abs(diff) : 0;
 const netDepositChargeLkr = Math.round((diff * safeDeposit + Number.EPSILON) * 100) / 100;

 return {
 deficitCount,
 surplusCount,
 netDepositChargeLkr,
 isBalanced: diff === 0,
 };
}

export function calculateContainerSummary(
 items: readonly ContainerInventoryItem[],
): ContainerSummaryTotals {
 let totalHoldingUnits = 0;
 let totalFullInStore = 0;
 let totalInUseActive = 0;
 let totalEmptiesAwaiting = 0;
 let totalDepositCapitalLkr = 0;
 let exchangeAlertCount = 0;

 for (const item of items) {
 totalHoldingUnits += item.totalHoldings;
 totalFullInStore += item.fullInStore;
 totalInUseActive += item.inUseActive;
 totalEmptiesAwaiting += item.emptyAwaitingExchange;
 totalDepositCapitalLkr += item.totalDepositValueLkr;

 if (item.emptyAwaitingExchange >= item.reorderThresholdEmpties) {
 exchangeAlertCount++;
 }
 }

 return {
 totalHoldingUnits,
 totalFullInStore,
 totalInUseActive,
 totalEmptiesAwaiting,
 totalDepositCapitalLkr: Math.round((totalDepositCapitalLkr + Number.EPSILON) * 100) / 100,
 exchangeAlertCount,
 };
}

export function applyContainerMovement(
 item: ContainerInventoryItem,
 movement: ContainerMovementInput,
): ContainerInventoryItem {
 let full = item.fullInStore;
 let active = item.inUseActive;
 let empty = item.emptyAwaitingExchange;

 switch (movement.movementType) {
 case "REFILL_EXCHANGE": {
 // Received new full units, returned empties to vendor
 full += Math.max(0, movement.fullReceived);
 empty = Math.max(0, empty - Math.max(0, movement.emptiesReturned));
 break;
 }
 case "CONNECT_IN_USE": {
 // Connect cylinder/crate to kitchen/bar
 const connectQty = Math.min(full, Math.max(0, movement.fullReceived));
 full -= connectQty;
 active += connectQty;
 break;
 }
 case "EMPTY_DEPLETED": {
 // Move exhausted container from active use to empty yard
 const depleteQty = Math.min(active, Math.max(0, movement.emptiesReturned));
 active -= depleteQty;
 empty += depleteQty;
 break;
 }
 case "DEPOSIT_REFUND": {
 // Return surplus empties to supplier for deposit reimbursement
 const returnQty = Math.min(empty, Math.max(0, movement.emptiesReturned));
 empty -= returnQty;
 break;
 }
 }

 const newTotal = full + active + empty;
 const newDepositVal =
 Math.round((newTotal * item.depositPerUnitLkr + Number.EPSILON) * 100) / 100;

 return {
 ...item,
 fullInStore: full,
 inUseActive: active,
 emptyAwaitingExchange: empty,
 totalHoldings: newTotal,
 totalDepositValueLkr: newDepositVal,
 lastExchangeDate: new Date().toISOString().split("T")[0] ?? item.lastExchangeDate,
 };
}

// ============================================================================
// Trilingual Dictionaries
// ============================================================================

export interface ContainerTranslation {
 readonly cardTitle: string;
 readonly cardSubtitle: string;
 readonly kpi: {
 readonly fullInStore: string;
 readonly inUseActive: string;
 readonly emptiesInYard: string;
 readonly depositCapital: string;
 readonly exchangeAlerts: string;
 };
 readonly categories: Record<ContainerCategory, string>;
 readonly movements: Record<ContainerMovementType, string>;
 readonly fields: {
 readonly brand: string;
 readonly supplier: string;
 readonly location: string;
 readonly depositPerUnit: string;
 readonly totalHoldings: string;
 readonly totalDeposit: string;
 readonly fullReceived: string;
 readonly emptiesGiven: string;
 readonly recordedBy: string;
 readonly notes: string;
 readonly deficitAlert: string;
 };
 readonly actions: {
 readonly recordExchange: string;
 readonly connectToUse: string;
 readonly markEmpty: string;
 readonly returnForDeposit: string;
 readonly cancel: string;
 readonly submit: string;
 };
}

export const CONTAINER_TRANSLATIONS: Record<"en" | "si" | "ta", ContainerTranslation> = {
 en: {
 cardTitle: "Empty Cylinder & Returnable Crate Tracker",
 cardSubtitle:
 "Full vs. empty container deposit management for Litro/Laugfs LPG, beer crates, and 19L water bottles",
 kpi: {
 fullInStore: "Full in Store",
 inUseActive: "Active In-Use",
 emptiesInYard: "Empties in Yard",
 depositCapital: "Locked Deposit Capital",
 exchangeAlerts: "Exchange Triggers",
 },
 categories: {
 ALL: "All Returnables",
 LPG_CYLINDER: "LPG Gas Cylinders",
 BEVERAGE_CRATE: "Beer & Beverage Crates",
 WATER_BOTTLE: "19L Water Bottles",
 CO2_CYLINDER: "CO2 Gas Cylinders",
 },
 movements: {
 REFILL_EXCHANGE: "Refill Exchange with Supplier",
 CONNECT_IN_USE: "Connect to Kitchen / Bar Station",
 EMPTY_DEPLETED: "Mark Depleted / Move to Yard",
 DEPOSIT_REFUND: "Return Empties for Deposit Refund",
 },
 fields: {
 brand: "Brand:",
 supplier: "Supplier / Distributor:",
 location: "Storage Yard:",
 depositPerUnit: "Deposit / Unit:",
 totalHoldings: "Total Fleet Units:",
 totalDeposit: "Total Deposit Balance:",
 fullReceived: "Full Units Received:",
 emptiesGiven: "Empty Units Handed Over:",
 recordedBy: "Storekeeper / Receiver:",
 notes: "Dispatch / Challan Notes:",
 deficitAlert: "Exchange Deficit: Extra deposit will be charged by vendor!",
 },
 actions: {
 recordExchange: "Refill Exchange",
 connectToUse: "Connect",
 markEmpty: "To Empty Yard",
 returnForDeposit: "Refund Deposit",
 cancel: "Cancel",
 submit: "Confirm Action",
 },
 },
 si: {
 cardTitle: "හිස් ගෑස් සිලින්ඩර සහ ආපසු භාරදෙන කූඩ ලුහුබැඳීම",
 cardSubtitle: "ලිට්රෝ/ලාෆ්ස් LPG, බියර් කූඩ සහ 19L වතුර බෝතල් තැන්පතු පාලනය",
 kpi: {
 fullInStore: "ගබඩාවේ ඇති පූර්ණ ඒකක",
 inUseActive: "භාවිතයේ පවතින ඒකක",
 emptiesInYard: "මිදුලේ ඇති හිස් ඒකක",
 depositCapital: "සිරවී ඇති තැන්පතු ප්රාග්ධනය",
 exchangeAlerts: "හුවමාරු ඇඟවීම්",
 },
 categories: {
 ALL: "සියලුම භාණ්ඩ",
 LPG_CYLINDER: "LPG ගෑස් සිලින්ඩර",
 BEVERAGE_CRATE: "බියර් සහ බීම කූඩ",
 WATER_BOTTLE: "19L වතුර බෝතල්",
 CO2_CYLINDER: "CO2 ගෑස් සිලින්ඩර",
 },
 movements: {
 REFILL_EXCHANGE: "සැපයුම්කරු සමඟ පිරවූ හුවමාරුව",
 CONNECT_IN_USE: "මුළුතැන්ගෙට/බාර් එකට සම්බන්ධ කිරීම",
 EMPTY_DEPLETED: "හිස් වූ පසු මිදුලට ගෙනයාම",
 DEPOSIT_REFUND: "තැන්පතු මුදල් ආපසු ලබාගැනීම",
 },
 fields: {
 brand: "වෙළඳ නාමය:",
 supplier: "සැපයුම්කරු:",
 location: "ගබඩා ස්ථානය:",
 depositPerUnit: "ඒකකයක තැන්පතුව:",
 totalHoldings: "මුළු ඒකක ගණන:",
 totalDeposit: "මුළු තැන්පතු වටිනාකම:",
 fullReceived: "ලැබුණු පූර්ණ ඒකක:",
 emptiesGiven: "භාරදුන් හිස් ඒකක:",
 recordedBy: "ගබඩා භාරකරු:",
 notes: "සටහන් / චැලන් අංකය:",
 deficitAlert: "හිස් ඒකක හිඟයි: අමතර තැන්පතු අය කෙරේ!",
 },
 actions: {
 recordExchange: "පිරවීම සහ හුවමාරුව",
 connectToUse: "සම්බන්ධ කරන්න",
 markEmpty: "හිස් මිදුලට",
 returnForDeposit: "තැන්පතු ආපසු",
 cancel: "අවලංගුයි",
 submit: "තහවුරු කරන්න",
 },
 },
 ta: {
 cardTitle: "வெற்று எரிவாயு சிலிண்டர் & பெட்டிகள் கண்காணிப்பு",
 cardSubtitle: "லிட்ரோ/லாஃப்ஸ் LPG, பீர் பெட்டிகள் மற்றும் 19L நீர் பாட்டில்கள் வைப்புத்தொகை மேலாண்மை",
 kpi: {
 fullInStore: "களஞ்சியத்தில் முழுமையானவை",
 inUseActive: "பயன்பாட்டில் உள்ளவை",
 emptiesInYard: "வெற்று சிலிண்டர்கள்",
 depositCapital: "முடக்கப்பட்ட வைப்புத்தொகை",
 exchangeAlerts: "பரிமாற்ற எச்சரிக்கைகள்",
 },
 categories: {
 ALL: "அனைத்தும்",
 LPG_CYLINDER: "LPG சிலிண்டர்கள்",
 BEVERAGE_CRATE: "பீர் & பான பெட்டிகள்",
 WATER_BOTTLE: "19L நீர் பாட்டில்கள்",
 CO2_CYLINDER: "CO2 சிலிண்டர்கள்",
 },
 movements: {
 REFILL_EXCHANGE: "மறு நிரப்பல் மற்றும் பரிமாற்றம்",
 CONNECT_IN_USE: "சமையலறைக்கு இணைக்கவும்",
 EMPTY_DEPLETED: "வெற்று இடத்திற்கு நகர்த்தவும்",
 DEPOSIT_REFUND: "வைப்புத்தொகை திரும்பப் பெறுதல்",
 },
 fields: {
 brand: "பிராண்ட்:",
 supplier: "வழங்குநர்:",
 location: "இடம்:",
 depositPerUnit: "ஒரு அலகு வைப்பு:",
 totalHoldings: "மொத்த அலகுகள்:",
 totalDeposit: "மொத்த வைப்புத்தொகை:",
 fullReceived: "பெறப்பட்ட முழுமையானவை:",
 emptiesGiven: "வழங்கப்பட்ட வெற்று அலகுகள்:",
 recordedBy: "பதிவு செய்தவர்:",
 notes: "குறிப்புகள்:",
 deficitAlert: "வெற்று அலகுகள் குறைவு: கூடுதல் வைப்பு வசூலிக்கப்படும்!",
 },
 actions: {
 recordExchange: "மறுநிரப்பல் பரிமாற்றம்",
 connectToUse: "இணைக்கவும்",
 markEmpty: "வெற்று இடத்திற்கு",
 returnForDeposit: "வைப்பு மீட்பு",
 cancel: "ரத்து செய்",
 submit: "செயலை உறுதிப்படுத்து",
 },
 },
};

// ============================================================================
// Default Sample Inventory Presets
// ============================================================================

export const DEFAULT_RETURNABLE_CONTAINERS: readonly ContainerInventoryItem[] = [
 {
 id: "cont-litro-37kg",
 tenantId: "tenant-colombo-grand",
 name: "Litro Industrial LPG Gas Cylinder 37.5kg",
 category: "LPG_CYLINDER",
 brand: "LITRO",
 supplierName: "Litro Gas Lanka Limited",
 depositPerUnitLkr: 21500,
 fullInStore: 8,
 inUseActive: 6,
 emptyAwaitingExchange: 12,
 totalHoldings: 26,
 totalDepositValueLkr: 559000,
 reorderThresholdEmpties: 10,
 location: "Main Gas Bank Manifold / Cylinder Yard",
 lastExchangeDate: "2026-10-18",
 },
 {
 id: "cont-litro-12kg",
 tenantId: "tenant-colombo-grand",
 name: "Litro Commercial LPG Cylinder 12.5kg",
 category: "LPG_CYLINDER",
 brand: "LITRO",
 supplierName: "Litro Gas Lanka Limited",
 depositPerUnitLkr: 8500,
 fullInStore: 14,
 inUseActive: 8,
 emptyAwaitingExchange: 6,
 totalHoldings: 28,
 totalDepositValueLkr: 238000,
 reorderThresholdEmpties: 8,
 location: "Pastry Bakery & Staff Mess Gas Store",
 lastExchangeDate: "2026-10-19",
 },
 {
 id: "cont-laugfs-12kg",
 tenantId: "tenant-colombo-grand",
 name: "Laugfs LPG Gas Cylinder 12.5kg",
 category: "LPG_CYLINDER",
 brand: "LAUGFS",
 supplierName: "Laugfs Gas PLC",
 depositPerUnitLkr: 8500,
 fullInStore: 4,
 inUseActive: 2,
 emptyAwaitingExchange: 4,
 totalHoldings: 10,
 totalDepositValueLkr: 85000,
 reorderThresholdEmpties: 4,
 location: "Beach Cabana BBQ Kitchen",
 lastExchangeDate: "2026-10-15",
 },
 {
 id: "cont-lion-crate",
 tenantId: "tenant-colombo-grand",
 name: "Lion Lager Beer Crates (12 x 625ml Glass)",
 category: "BEVERAGE_CRATE",
 brand: "LION_BREWERY",
 supplierName: "Lion Brewery Ceylon PLC",
 depositPerUnitLkr: 1500,
 fullInStore: 45,
 inUseActive: 20,
 emptyAwaitingExchange: 35,
 totalHoldings: 100,
 totalDepositValueLkr: 150000,
 reorderThresholdEmpties: 25,
 location: "Cellar Empty Bottle Storage Bay",
 lastExchangeDate: "2026-10-17",
 },
 {
 id: "cont-water-19l",
 tenantId: "tenant-colombo-grand",
 name: "American Premium Mineral Water 19L Dispenser Bottles",
 category: "WATER_BOTTLE",
 brand: "AMERICAN_PREMIUM",
 supplierName: "American Premium Water Systems",
 depositPerUnitLkr: 2800,
 fullInStore: 22,
 inUseActive: 18,
 emptyAwaitingExchange: 20,
 totalHoldings: 60,
 totalDepositValueLkr: 168000,
 reorderThresholdEmpties: 15,
 location: "Housekeeping Water Storage Dock",
 lastExchangeDate: "2026-10-19",
 },
 {
 id: "cont-co2-10kg",
 tenantId: "tenant-colombo-grand",
 name: "Draft Beer & Soda CO2 Carbonation Cylinders 10kg",
 category: "CO2_CYLINDER",
 brand: "CEYLON_BEVERAGE",
 supplierName: "Ceylon Beverage Distributors",
 depositPerUnitLkr: 16000,
 fullInStore: 3,
 inUseActive: 3,
 emptyAwaitingExchange: 2,
 totalHoldings: 8,
 totalDepositValueLkr: 128000,
 reorderThresholdEmpties: 2,
 location: "Pool Bar Carbonator Manifold",
 lastExchangeDate: "2026-10-10",
 },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface ContainerKpiRowProps {
 readonly t: ContainerTranslation;
 readonly summary: ContainerSummaryTotals;
}

function ContainerKpiRow(props: ContainerKpiRowProps) {
 const { t, summary } = props;

 return (
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
 <GlassCard className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50">
 <span className="text-[11px] text-[#0B6E4F] font-semibold block uppercase">
 {t.kpi.fullInStore}
 </span>
 <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
 {summary.totalFullInStore}
 </div>
 <span className="text-[10px] text-slate-500">Ready for connection</span>
 </GlassCard>

 <GlassCard className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50">
 <span className="text-[11px] text-blue-800 font-semibold block uppercase">
 {t.kpi.inUseActive}
 </span>
 <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
 {summary.totalInUseActive}
 </div>
 <span className="text-[10px] text-slate-500">Active on manifolds</span>
 </GlassCard>

 <GlassCard className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50">
 <span className="text-[11px] text-amber-700 font-semibold block uppercase">
 {t.kpi.emptiesInYard}
 </span>
 <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
 {summary.totalEmptiesAwaiting}
 </div>
 <span className="text-[10px] text-slate-500">Ready for supplier truck</span>
 </GlassCard>

 <GlassCard className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50">
 <span className="text-[11px] text-purple-800 font-semibold block uppercase">
 {t.kpi.depositCapital}
 </span>
 <div className="text-lg font-bold text-purple-800 tabular-nums mt-0.5">
 {formatContainerLkr(summary.totalDepositCapitalLkr)}
 </div>
 <span className="text-[10px] text-slate-500">Locked vendor deposits</span>
 </GlassCard>

 <GlassCard className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50 col-span-2 lg:col-span-1">
 <span className="text-[11px] text-rose-800 font-semibold block uppercase">
 {t.kpi.exchangeAlerts}
 </span>
 <div className="text-xl font-bold text-rose-800 tabular-nums mt-0.5">
 {summary.exchangeAlertCount}
 </div>
 <span className="text-[10px] text-slate-500">Empties past reorder trigger</span>
 </GlassCard>
 </div>
 );
}

interface ActionModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly item: ContainerInventoryItem | null;
 readonly t: ContainerTranslation;
 readonly onConfirmMovement: (
 item: ContainerInventoryItem,
 movement: ContainerMovementInput,
 ) => void;
}

function ContainerMovementModal(props: ActionModalProps) {
 const { isOpen, onClose, item, t, onConfirmMovement } = props;
 const movementTypeId = useId();
 const fullQtyId = useId();
 const emptyQtyId = useId();
 const recordedById = useId();
 const notesId = useId();

 const [movementType, setMovementType] = useState<ContainerMovementType>("REFILL_EXCHANGE");
 const [fullReceived, setFullReceived] = useState<number>(5);
 const [emptiesReturned, setEmptiesReturned] = useState<number>(5);
 const [recordedBy, setRecordedBy] = useState<string>("S. Perera (Stores)");
 const [notes, setNotes] = useState<string>("");

 if (!item) return null;

 const variance = calculateExchangeDepositVariance(
 fullReceived,
 emptiesReturned,
 item.depositPerUnitLkr,
 );

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!item) return;

 onConfirmMovement(item, {
 movementType,
 fullReceived,
 emptiesReturned,
 recordedBy,
 notes: notes.trim(),
 });
 onClose();
 }

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title={`${item.name} — ${t.actions.recordExchange}`}
 size="md"
 >
 <form onSubmit={handleSubmit} className="space-y-4 text-xs">
 <div>
 <label htmlFor={movementTypeId} className="block text-slate-700 mb-1">
 Operation Type:
 </label>
 <select
 id={movementTypeId}
 value={movementType}
 onChange={(e) => setMovementType(e.target.value as ContainerMovementType)}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 min-h-[44px]"
 >
 {(Object.keys(t.movements) as ContainerMovementType[]).map((mKey) => (
 <option key={mKey} value={mKey}>
 {t.movements[mKey]}
 </option>
 ))}
 </select>
 </div>

 {movementType === "REFILL_EXCHANGE" && (
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor={fullQtyId} className="block text-slate-700 mb-1">
 {t.fields.fullReceived}
 </label>
 <input
 id={fullQtyId}
 type="number"
 min={0}
 value={fullReceived}
 onChange={(e) => setFullReceived(Math.max(0, Number(e.target.value)))}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 tabular-nums min-h-[44px]"
 />
 </div>
 <div>
 <label htmlFor={emptyQtyId} className="block text-slate-700 mb-1">
 {t.fields.emptiesGiven}
 </label>
 <input
 id={emptyQtyId}
 type="number"
 min={0}
 value={emptiesReturned}
 onChange={(e) => setEmptiesReturned(Math.max(0, Number(e.target.value)))}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 tabular-nums min-h-[44px]"
 />
 </div>
 </div>
 )}

 {movementType === "CONNECT_IN_USE" && (
 <div>
 <label htmlFor={fullQtyId} className="block text-slate-700 mb-1">
 Quantity to Connect to Manifold (Max {item.fullInStore}):
 </label>
 <input
 id={fullQtyId}
 type="number"
 min={1}
 max={item.fullInStore}
 value={fullReceived}
 onChange={(e) => setFullReceived(Math.max(1, Number(e.target.value)))}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 tabular-nums min-h-[44px]"
 />
 </div>
 )}

 {movementType === "EMPTY_DEPLETED" && (
 <div>
 <label htmlFor={emptyQtyId} className="block text-slate-700 mb-1">
 Quantity Depleted to Yard (Max {item.inUseActive}):
 </label>
 <input
 id={emptyQtyId}
 type="number"
 min={1}
 max={item.inUseActive}
 value={emptiesReturned}
 onChange={(e) => setEmptiesReturned(Math.max(1, Number(e.target.value)))}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 tabular-nums min-h-[44px]"
 />
 </div>
 )}

 {movementType === "DEPOSIT_REFUND" && (
 <div>
 <label htmlFor={emptyQtyId} className="block text-slate-700 mb-1">
 Empties Returned for Deposit Cash/Credit (Max {item.emptyAwaitingExchange}):
 </label>
 <input
 id={emptyQtyId}
 type="number"
 min={1}
 max={item.emptyAwaitingExchange}
 value={emptiesReturned}
 onChange={(e) => setEmptiesReturned(Math.max(1, Number(e.target.value)))}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 tabular-nums min-h-[44px]"
 />
 </div>
 )}

 {movementType === "REFILL_EXCHANGE" && !variance.isBalanced && (
 <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-800">
 {variance.deficitCount > 0 ? (
 <div>
 <strong>Deposit Deficit: </strong> Handed over {variance.deficitCount} fewer empties
 than full received. Supplier will bill an extra{" "}
 <span className="font-mono font-bold">
 {formatContainerLkr(variance.netDepositChargeLkr)}
 </span>{" "}
 deposit charge!
 </div>
 ) : (
 <div>
 <strong>Deposit Surplus: </strong> Returned {variance.surplusCount} extra empties.
 Supplier owes hotel{" "}
 <span className="font-mono font-bold">
 {formatContainerLkr(Math.abs(variance.netDepositChargeLkr))}
 </span>{" "}
 deposit credit!
 </div>
 )}
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label htmlFor={recordedById} className="block text-slate-700 mb-1">
 {t.fields.recordedBy}
 </label>
 <input
 id={recordedById}
 type="text"
 value={recordedBy}
 onChange={(e) => setRecordedBy(e.target.value)}
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 min-h-[44px]"
 required
 />
 </div>
 <div>
 <label htmlFor={notesId} className="block text-slate-700 mb-1">
 {t.fields.notes}
 </label>
 <input
 id={notesId}
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="e.g. Litro delivery invoice #LT-8910"
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 min-h-[44px]"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 rounded-lg min-h-[44px] cursor-pointer"
 >
 {t.actions.cancel}
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow min-h-[44px] cursor-pointer"
 >
 {t.actions.submit}
 </button>
 </div>
 </form>
 </DialogModal>
 );
}

// ============================================================================
// Main Exported Component: ReturnableContainerCard
// ============================================================================

export interface ReturnableContainerCardProps {
 readonly initialItems?: readonly ContainerInventoryItem[];
 readonly locale?: "en" | "si" | "ta";
 readonly onUpdateItems?: (items: readonly ContainerInventoryItem[]) => void;
}

export function ReturnableContainerCard(props: ReturnableContainerCardProps) {
 const { initialItems = DEFAULT_RETURNABLE_CONTAINERS, locale = "en", onUpdateItems } = props;

 const t = CONTAINER_TRANSLATIONS[locale] ?? CONTAINER_TRANSLATIONS.en;

 const [items, setItems] = useState<readonly ContainerInventoryItem[]>(initialItems);
 const [selectedCategory, setSelectedCategory] = useState<ContainerCategory>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [activeModalItem, setActiveModalItem] = useState<ContainerInventoryItem | null>(null);

 const searchInputId = useId();

 const summary = useMemo(() => calculateContainerSummary(items), [items]);

 const filteredItems = useMemo(() => {
 return items.filter((it) => {
 const matchCat = selectedCategory === "ALL" || it.category === selectedCategory;
 const matchQuery =
 searchQuery === "" ||
 it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 it.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
 it.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
 return matchCat && matchQuery;
 });
 }, [items, selectedCategory, searchQuery]);

 const categoryOptions: SegmentedControlOption<ContainerCategory>[] = [
 { id: "ALL", label: t.categories.ALL },
 { id: "LPG_CYLINDER", label: t.categories.LPG_CYLINDER },
 { id: "BEVERAGE_CRATE", label: t.categories.BEVERAGE_CRATE },
 { id: "WATER_BOTTLE", label: t.categories.WATER_BOTTLE },
 { id: "CO2_CYLINDER", label: t.categories.CO2_CYLINDER },
 ];

 function handleConfirmMovement(
 targetItem: ContainerInventoryItem,
 movement: ContainerMovementInput,
 ) {
 const updated = items.map((it) =>
 it.id === targetItem.id ? applyContainerMovement(it, movement) : it,
 );
 setItems(updated);
 onUpdateItems?.(updated);
 }

 return (
 <div className="space-y-4">
 {/* Executive Card Header */}
 <GlassCard className="p-4 rounded-xl border border-[#E2E8F0] bg-white">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
 <div>
 <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
 {t.cardTitle}
 </h3>
 <p className="text-xs text-slate-500 mt-0.5">{t.cardSubtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-500/20 text-purple-800 border border-purple-500/30 font-semibold">
 Fleet: {summary.totalHoldingUnits} Units
 </span>
 </div>
 </div>

 {/* 5-Card Bento KPI Row */}
 <div className="pt-3">
 <ContainerKpiRow t={t} summary={summary} />
 </div>
 </GlassCard>

 {/* Filter and Search Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <SegmentedControl
 options={categoryOptions}
 value={selectedCategory}
 onChange={(cat) => setSelectedCategory(cat)}
 size="sm"
 />

 <div className="w-full sm:w-64">
 <label htmlFor={searchInputId} className="sr-only">
 Search containers
 </label>
 <input
 id={searchInputId}
 type="search"
 value={searchQuery}
 onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
 placeholder="Search cylinders, crates, brands..."
 className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-slate-900 text-xs min-h-[36px] placeholder-slate-400"
 />
 </div>
 </div>

 {/* Grid of Container Inventory Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {filteredItems.map((item) => {
 const isReorderDue = item.emptyAwaitingExchange >= item.reorderThresholdEmpties;

 return (
 <GlassCard
 key={item.id}
 className={`p-4 rounded-xl border transition-all ${
 isReorderDue
 ? "border-amber-500/40 bg-amber-950/20 shadow-lg"
 : "border-[#E2E8F0] bg-white"
 }`}
 >
 <div className="flex justify-between items-start gap-2">
 <div>
 <div className="font-bold text-sm text-slate-900">{item.name}</div>
 <div className="text-[11px] text-slate-500">{item.supplierName}</div>
 </div>
 <StatusBadge
 status={isReorderDue ? "EXCHANGE_ALERT" : "NORMAL"}
 label={isReorderDue ? "Exchange Due" : "Stock Normal"}
 color={isReorderDue ? "amber" : "green"}
 size="sm"
 />
 </div>

 {/* Tri-state Inventory Bar */}
 <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-[#E2E8F0] text-center text-xs">
 <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/20">
 <span className="text-[10px] text-[#0B6E4F] block">Full</span>
 <span className="text-sm font-bold text-slate-900 tabular-nums">
 {item.fullInStore}
 </span>
 </div>
 <div className="p-1.5 rounded bg-blue-950/40 border border-blue-500/20">
 <span className="text-[10px] text-blue-800 block">In-Use</span>
 <span className="text-sm font-bold text-slate-900 tabular-nums">
 {item.inUseActive}
 </span>
 </div>
 <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/20">
 <span className="text-[10px] text-amber-800 block">Empty</span>
 <span className="text-sm font-bold text-slate-900 tabular-nums">
 {item.emptyAwaitingExchange}
 </span>
 </div>
 </div>

 {/* Deposit Valuation & Location */}
 <div className="text-xs space-y-1 text-slate-700">
 <div className="flex justify-between">
 <span>{t.fields.depositPerUnit}</span>
 <span className="font-mono text-slate-900">
 {formatContainerLkr(item.depositPerUnitLkr)}
 </span>
 </div>
 <div className="flex justify-between font-semibold">
 <span className="text-purple-800">{t.fields.totalDeposit}</span>
 <span className="font-mono text-purple-800">
 {formatContainerLkr(item.totalDepositValueLkr)}
 </span>
 </div>
 <div className="text-[10px] text-slate-500 truncate">Pin {item.location}</div>
 </div>

 {/* Action Button */}
 <div className="pt-3 mt-1 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => setActiveModalItem(item)}
 className="w-full min-h-[44px] px-3 py-2 bg-slate-50 hover:bg-slate-50 active:scale-95 text-slate-900 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {t.actions.recordExchange}
 </button>
 </div>
 </GlassCard>
 );
 })}
 </div>

 {/* Movement Modal */}
 <ContainerMovementModal
 isOpen={Boolean(activeModalItem)}
 onClose={() => setActiveModalItem(null)}
 item={activeModalItem}
 t={t}
 onConfirmMovement={handleConfirmMovement}
 />
 </div>
 );
}
