import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type RestrictionScope = "ALL_CHANNELS" | "OTA_ONLY" | "DIRECT_ONLY";

export interface RestrictionRule {
 readonly id: string;
 readonly name: string;
 readonly startDate: string; // YYYY-MM-DD
 readonly endDate: string; // YYYY-MM-DD
 readonly roomTypeIds: ReadonlyArray<string>; // ["ALL"] or specific IDs
 readonly stopSell: boolean;
 readonly closedToArrival: boolean; // CTA
 readonly closedToDeparture: boolean; // CTD
 readonly minStayArrival: number; // MinLOS (e.g. 2, 3)
 readonly minStayThrough: number;
 readonly scope: RestrictionScope;
 readonly isActive: boolean;
 readonly syncedToChannex: boolean;
 readonly syncedToDirect: boolean;
 readonly updatedAtIso: string;
}

export interface SriLankanPeakPreset {
 readonly id: string;
 readonly name: string;
 readonly description: string;
 readonly defaultMinStay: number;
 readonly defaultStopSellOta: boolean;
 readonly seasonTag: string;
 readonly dateHint: string;
}

export interface QuickRestrictionsBarProps {
 readonly restrictions?: ReadonlyArray<RestrictionRule> | undefined;
 readonly onSaveRestriction?: ((rule: RestrictionRule) => void) | undefined;
 readonly onToggleRestriction?: ((id: string, active: boolean) => void) | undefined;
 readonly onDeleteRestriction?: ((id: string) => void) | undefined;
 readonly onEmergencyStopSellAll?: ((active: boolean) => void) | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Default Constants & Sri Lankan Presets
// ============================================================================

export const SRI_LANKAN_PEAK_PRESETS: ReadonlyArray<SriLankanPeakPreset> = [
 {
 id: "preset-perahera",
 name: "Kandy Esala Perahera Festival",
 description:
 "Peak cultural pageant in Kandy. Enforce 3-night MinLOS and block OTA discounting.",
 defaultMinStay: 3,
 defaultStopSellOta: true,
 seasonTag: "Cultural Peak",
 dateHint: "August (10 nights)",
 },
 {
 id: "preset-nye-galle",
 name: "New Year's Eve & Galle Lit Fest",
 description:
 "Southern coast ultra-peak holiday rush. Minimum 3 nights with compulsory direct booking.",
 defaultMinStay: 3,
 defaultStopSellOta: false,
 seasonTag: "Festive Gala",
 dateHint: "Dec 30 - Jan 02",
 },
 {
 id: "preset-avurudu",
 name: "Sinhala & Tamil Aluth Avurudu",
 description: "National New Year holiday. High resident demand with 2-night minimum stay.",
 defaultMinStay: 2,
 defaultStopSellOta: true,
 seasonTag: "Resident Peak",
 dateHint: "Apr 12 - Apr 16",
 },
 {
 id: "preset-vesak-poya",
 name: "Vesak / Poson Extended Poya",
 description:
 "Long holiday weekends. Close to arrival on full moon poya day and require 2 nights.",
 defaultMinStay: 2,
 defaultStopSellOta: false,
 seasonTag: "Poya Holiday",
 dateHint: "May / June Full Moon",
 },
 {
 id: "preset-whale-season",
 name: "Mirissa Blue Whale Season",
 description:
 "High tourist influx in Mirissa & Weligama. Enforce 2-night minimum on ocean suites.",
 defaultMinStay: 2,
 defaultStopSellOta: false,
 seasonTag: "Coastal High",
 dateHint: "Dec - Mar",
 },
];

export const DEFAULT_RESTRICTIONS: ReadonlyArray<RestrictionRule> = [
 {
 id: "restr-nye-2026",
 name: "New Year's Eve Festive Gala Peak",
 startDate: "2026-12-30",
 endDate: "2027-01-02",
 roomTypeIds: ["ALL"],
 stopSell: false,
 closedToArrival: false,
 closedToDeparture: true,
 minStayArrival: 3,
 minStayThrough: 3,
 scope: "ALL_CHANNELS",
 isActive: true,
 syncedToChannex: true,
 syncedToDirect: true,
 updatedAtIso: "2026-10-19T08:30:00Z",
 },
 {
 id: "restr-avurudu-2027",
 name: "Sinhala & Tamil Avurudu Direct Resident Priority",
 startDate: "2027-04-12",
 endDate: "2027-04-16",
 roomTypeIds: ["ALL"],
 stopSell: true,
 closedToArrival: false,
 closedToDeparture: false,
 minStayArrival: 2,
 minStayThrough: 2,
 scope: "OTA_ONLY",
 isActive: true,
 syncedToChannex: true,
 syncedToDirect: true,
 updatedAtIso: "2026-10-19T08:30:00Z",
 },
 {
 id: "restr-poya-nov",
 name: "Il Full Moon Poya Weekend",
 startDate: "2026-11-23",
 endDate: "2026-11-25",
 roomTypeIds: ["ALL"],
 stopSell: false,
 closedToArrival: true,
 closedToDeparture: false,
 minStayArrival: 2,
 minStayThrough: 2,
 scope: "ALL_CHANNELS",
 isActive: false,
 syncedToChannex: false,
 syncedToDirect: false,
 updatedAtIso: "2026-10-19T08:30:00Z",
 },
];

export const SCOPE_OPTIONS: ReadonlyArray<SegmentedControlOption<RestrictionScope>> = [
 { id: "ALL_CHANNELS", label: "All Channels" },
 { id: "OTA_ONLY", label: "OTAs Only (Channex)" },
 { id: "DIRECT_ONLY", label: "Direct Engine Only" },
];

// ============================================================================
// Pure Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function isDateWithinRange(date: string, start: string, end: string): boolean {
 return date >= start && date <= end;
}

function matchesRoom(roomTypeIds: ReadonlyArray<string>, roomTypeId: string): boolean {
 return roomTypeIds.includes("ALL") || roomTypeIds.includes(roomTypeId);
}

function matchesScope(scope: "DIRECT" | "OTA", ruleScope: RestrictionScope): boolean {
 if (ruleScope === "ALL_CHANNELS") return true;
 if (scope === "OTA" && ruleScope === "OTA_ONLY") return true;
 return scope === "DIRECT" && ruleScope === "DIRECT_ONLY";
}

function ruleBlocksDate(
 rule: RestrictionRule,
 date: string,
 roomTypeId: string,
 scope: "DIRECT" | "OTA",
): boolean {
 if (!rule.isActive || !rule.stopSell) return false;
 if (!isDateWithinRange(date, rule.startDate, rule.endDate)) return false;
 if (!matchesRoom(rule.roomTypeIds, roomTypeId)) return false;
 return matchesScope(scope, rule.scope);
}

export function isStopSellActive(
 date: string,
 roomTypeId: string,
 scope: "DIRECT" | "OTA",
 restrictions: ReadonlyArray<RestrictionRule>,
): boolean {
 return restrictions.some((r) => ruleBlocksDate(r, date, roomTypeId, scope));
}

export function getEffectiveMinStay(
 date: string,
 roomTypeId: string,
 restrictions: ReadonlyArray<RestrictionRule>,
): number {
 let highestMinStay = 1;

 for (const r of restrictions) {
 if (!r.isActive || r.minStayArrival <= 1) continue;
 if (!isDateWithinRange(date, r.startDate, r.endDate)) continue;

 const matchesRoom = r.roomTypeIds.includes("ALL") || r.roomTypeIds.includes(roomTypeId);
 if (!matchesRoom) continue;

 if (r.minStayArrival > highestMinStay) {
 highestMinStay = r.minStayArrival;
 }
 }

 return highestMinStay;
}

export function validateRestrictionRule(rule: Partial<RestrictionRule>): {
 readonly isValid: boolean;
 readonly error?: string | undefined;
} {
 if (!rule.name || rule.name.trim().length < 3) {
 return { isValid: false, error: "Please enter a descriptive name for this restriction." };
 }
 if (!rule.startDate || !rule.endDate) {
 return { isValid: false, error: "Please select both start and end dates." };
 }
 if (rule.startDate > rule.endDate) {
 return { isValid: false, error: "End date must be greater than or equal to start date." };
 }
 if (rule.minStayArrival !== undefined && rule.minStayArrival < 1) {
 return { isValid: false, error: "Minimum length of stay must be at least 1 night." };
 }
 return { isValid: true };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

function PresetsCarousel({
 onSelectPreset,
}: {
 readonly onSelectPreset: (preset: SriLankanPeakPreset) => void;
}) {
 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-700 ">
 Sri Lankan Peak &amp; Festival Presets:
 </span>
 <span className="text-[11px] text-slate-400">1-click setup</span>
 </div>

 <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
 {SRI_LANKAN_PEAK_PRESETS.map((preset) => (
 <button
 key={preset.id}
 type="button"
 onClick={() => onSelectPreset(preset)}
 className="flex-shrink-0 p-3 rounded-2xl bg-white/60 border border-slate-200/60 hover:border-blue-500/50 hover:bg-blue-50/50 transition-all text-left max-w-xs group min-h-[44px]"
 >
 <div className="flex items-center justify-between gap-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 ">
 {preset.seasonTag}
 </span>
 <span className="text-[10px] text-slate-400 font-mono">{preset.dateHint}</span>
 </div>
 <div className="text-xs font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">
 {preset.name}
 </div>
 <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
 MinLOS {preset.defaultMinStay}N •{" "}
 {preset.defaultStopSellOta ? "Stop-Sell OTAs" : "All Channels"}
 </div>
 </button>
 ))}
 </div>
 </div>
 );
}

function getRestrictionStatus(rule: RestrictionRule): {
 readonly color: StatusColor;
 readonly label: string;
} {
 if (!rule.isActive) {
 return { color: "gray", label: "INACTIVE" };
 }
 if (rule.stopSell) {
 return { color: "red", label: "STOP-SELL ACTIVE" };
 }
 return { color: "green", label: `MinLOS ${rule.minStayArrival}N` };
}

function getScopeLabel(scope: RestrictionScope): string {
 switch (scope) {
 case "ALL_CHANNELS":
 return "All Channels";
 case "OTA_ONLY":
 return "OTAs (Channex)";
 case "DIRECT_ONLY":
 return "Direct Engine";
 }
}

function getRoomScopeSummary(roomTypeIds: ReadonlyArray<string>): string {
 if (roomTypeIds.includes("ALL")) {
 return "All Inventory";
 }
 return `${roomTypeIds.length} Types`;
}

function RowActions({
 rule,
 onToggle,
 onDelete,
 onEdit,
}: {
 readonly rule: RestrictionRule;
 readonly onToggle: (id: string, active: boolean) => void;
 readonly onDelete: (id: string) => void;
 readonly onEdit: (rule: RestrictionRule) => void;
}) {
 const syncClass = rule.syncedToChannex ? "bg-emerald-500" : "bg-slate-300 ";
 const syncTitle = rule.syncedToChannex ? "Live on Channex ARI" : "Pending Sync";
 const toggleClass = rule.isActive
 ? "bg-slate-100 hover:bg-slate-200 text-slate-700 "
 : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm";

 return (
 <div className="flex items-center gap-2.5 sm:self-center self-end">
 <div title={syncTitle} className={`w-2.5 h-2.5 rounded-full ${syncClass}`} />

 <button
 type="button"
 onClick={() => onToggle(rule.id, !rule.isActive)}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${toggleClass}`}
 >
 {rule.isActive ? "Pause" : "Enable"}
 </button>

 <button
 type="button"
 onClick={() => onEdit(rule)}
 className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
 aria-label="Edit restriction"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
 />
 </svg>
 </button>

 <button
 type="button"
 onClick={() => onDelete(rule.id)}
 className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
 aria-label="Delete restriction"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1-1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
 />
 </svg>
 </button>
 </div>
 );
}

function RestrictionRow({
 rule,
 onToggle,
 onDelete,
 onEdit,
}: {
 readonly rule: RestrictionRule;
 readonly onToggle: (id: string, active: boolean) => void;
 readonly onDelete: (id: string) => void;
 readonly onEdit: (rule: RestrictionRule) => void;
}) {
 const status = getRestrictionStatus(rule);
 const scopeLabel = getScopeLabel(rule.scope);
 const roomSummary = getRoomScopeSummary(rule.roomTypeIds);

 return (
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 border border-slate-200/60 hover:shadow-sm transition-all">
 <div className="space-y-1">
 <div className="flex flex-wrap items-center gap-2">
 <StatusBadge status={status.label} label={status.label} color={status.color} size="sm" />
 <span className="font-bold text-sm text-slate-900 ">{rule.name}</span>
 <span className="text-xs text-slate-400 font-mono">{scopeLabel}</span>
 </div>

 <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
 <span className="tabular-nums-lkr font-semibold text-slate-700 ">
 {rule.startDate} to {rule.endDate}
 </span>
 <span>•</span>
 <span>Rooms: {roomSummary}</span>
 {rule.closedToArrival && (
 <span className="text-amber-600 font-medium">CTA</span>
 )}
 {rule.closedToDeparture && (
 <span className="text-amber-600 font-medium">CTD</span>
 )}
 </div>
 </div>

 <RowActions rule={rule} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
 </div>
 );
}

function RestrictionEditorModal({
 isOpen,
 onClose,
 initialRule,
 onSave,
}: {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly initialRule?: RestrictionRule | undefined;
 readonly onSave: (rule: RestrictionRule) => void;
}) {
 const formId = useId();

 const [name, setName] = useState<string>(initialRule?.name ?? "");
 const [startDate, setStartDate] = useState<string>(initialRule?.startDate ?? "2026-12-30");
 const [endDate, setEndDate] = useState<string>(initialRule?.endDate ?? "2027-01-02");
 const [stopSell, setStopSell] = useState<boolean>(initialRule?.stopSell ?? false);
 const [closedToArrival, setClosedToArrival] = useState<boolean>(
 initialRule?.closedToArrival ?? false,
 );
 const [closedToDeparture, setClosedToDeparture] = useState<boolean>(
 initialRule?.closedToDeparture ?? false,
 );
 const [minStayArrival, setMinStayArrival] = useState<number>(initialRule?.minStayArrival ?? 2);
 const [scope, setScope] = useState<RestrictionScope>(initialRule?.scope ?? "ALL_CHANNELS");
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);

 const check = validateRestrictionRule({
 name,
 startDate,
 endDate,
 minStayArrival,
 });

 if (!check.isValid) {
 setError(check.error ?? "Invalid restriction configuration.");
 return;
 }

 const saved: RestrictionRule = {
 id: initialRule?.id ?? `restr-${Date.now()}`,
 name: name.trim(),
 startDate,
 endDate,
 roomTypeIds: initialRule?.roomTypeIds ?? ["ALL"],
 stopSell,
 closedToArrival,
 closedToDeparture,
 minStayArrival,
 minStayThrough: minStayArrival,
 scope,
 isActive: true,
 syncedToChannex: true,
 syncedToDirect: true,
 updatedAtIso: new Date().toISOString(),
 };

 onSave(saved);
 onClose();
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title={initialRule ? "Edit Distribution Restriction" : "Create Distribution Restriction"}
 description="Instantly push Stop-Sell and Minimum Length of Stay (MinLOS) rules to Channex OTAs and Direct Engine."
 size="lg"
 >
 <form onSubmit={handleSubmit} className="space-y-4 pt-2">
 {error && (
 <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs">
 {error}
 </div>
 )}

 <div>
 <label
 htmlFor={`${formId}-name`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Restriction Title <span className="text-rose-500">*</span>
 </label>
 <input
 id={`${formId}-name`}
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. Kandy Perahera 3-Night Minimum"
 className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-sm focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={`${formId}-start-date`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Start Date <span className="text-rose-500">*</span>
 </label>
 <input
 id={`${formId}-start-date`}
 type="date"
 required
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs font-mono tabular-nums-lkr focus:ring-2 focus:ring-blue-500 transition-all min-h-[40px]"
 />
 </div>

 <div>
 <label
 htmlFor={`${formId}-end-date`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 End Date <span className="text-rose-500">*</span>
 </label>
 <input
 id={`${formId}-end-date`}
 type="date"
 required
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs font-mono tabular-nums-lkr focus:ring-2 focus:ring-blue-500 transition-all min-h-[40px]"
 />
 </div>
 </div>

 <div className="space-y-1.5 pt-1">
 <span className="block text-xs font-semibold text-slate-700 ">
 Channel Scope <span className="text-rose-500">*</span>
 </span>
 <SegmentedControl
 options={SCOPE_OPTIONS}
 value={scope}
 onChange={(s) => setScope(s)}
 size="md"
 />
 </div>

 {/* Toggles Bento Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
 <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer bg-white/50 ">
 <input
 type="checkbox"
 checked={stopSell}
 onChange={(e) => setStopSell(e.target.checked)}
 className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
 />
 <div className="text-xs">
 <span className="font-semibold text-slate-900 ">Stop-Sell</span>
 <p className="text-[10px] text-slate-500">Block all bookings</p>
 </div>
 </label>

 <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer bg-white/50 ">
 <input
 type="checkbox"
 checked={closedToArrival}
 onChange={(e) => setClosedToArrival(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
 />
 <div className="text-xs">
 <span className="font-semibold text-slate-900 ">Close to Arrival</span>
 <p className="text-[10px] text-slate-500">No check-in on date</p>
 </div>
 </label>

 <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer bg-white/50 ">
 <input
 type="checkbox"
 checked={closedToDeparture}
 onChange={(e) => setClosedToDeparture(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
 />
 <div className="text-xs">
 <span className="font-semibold text-slate-900 ">
 Close to Departure
 </span>
 <p className="text-[10px] text-slate-500">No checkout on date</p>
 </div>
 </label>
 </div>

 {/* MinLOS Stepper */}
 <div className="pt-2">
 <label
 htmlFor={`${formId}-min-stay`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Minimum Length of Stay (MinLOS Nights)
 </label>
 <div className="flex items-center gap-3">
 <input
 id={`${formId}-min-stay`}
 type="number"
 min={1}
 max={14}
 value={minStayArrival}
 onChange={(e) =>
 setMinStayArrival(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
 }
 className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm font-semibold tabular-nums-lkr text-center focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
 />
 <div className="flex items-center gap-1.5">
 {[1, 2, 3, 5, 7].map((num) => (
 <button
 key={num}
 type="button"
 onClick={() => setMinStayArrival(num)}
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] transition-all ${
 minStayArrival === num
 ? "bg-blue-600 text-white"
 : "bg-slate-100 hover:bg-slate-200 text-slate-700 "
 }`}
 >
 {num}N
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Modal Actions */}
 <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/50 ">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all min-h-[44px]"
 >
 Save &amp; Push to Channex
 </button>
 </div>
 </form>
 </DialogModal>
 );
}

// ============================================================================
// Main QuickRestrictionsBar Component (Cognitive Complexity <= 12)
// ============================================================================

export function QuickRestrictionsBar({
 restrictions = DEFAULT_RESTRICTIONS,
 onSaveRestriction,
 onToggleRestriction,
 onDeleteRestriction,
 onEmergencyStopSellAll,
 className = "",
}: QuickRestrictionsBarProps) {
 const [rules, setRules] = useState<ReadonlyArray<RestrictionRule>>(restrictions);
 const [modalOpen, setModalOpen] = useState<boolean>(false);
 const [editingRule, setEditingRule] = useState<RestrictionRule | undefined>(undefined);
 const [emergencyActive, setEmergencyActive] = useState<boolean>(false);

 const activeCount = rules.filter((r) => r.isActive).length;
 const stopSellCount = rules.filter((r) => r.isActive && r.stopSell).length;

 const handleToggle = (id: string, active: boolean) => {
 setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: active } : r)));
 onToggleRestriction?.(id, active);
 };

 const handleDelete = (id: string) => {
 setRules((prev) => prev.filter((r) => r.id !== id));
 onDeleteRestriction?.(id);
 };

 const handleSave = (saved: RestrictionRule) => {
 setRules((prev) => {
 const exists = prev.some((r) => r.id === saved.id);
 if (exists) {
 return prev.map((r) => (r.id === saved.id ? saved : r));
 }
 return [saved, ...prev];
 });
 onSaveRestriction?.(saved);
 };

 const handleSelectPreset = (preset: SriLankanPeakPreset) => {
 setEditingRule({
 id: `restr-preset-${Date.now()}`,
 name: preset.name,
 startDate: "2026-12-20",
 endDate: "2026-12-31",
 roomTypeIds: ["ALL"],
 stopSell: preset.defaultStopSellOta,
 closedToArrival: false,
 closedToDeparture: false,
 minStayArrival: preset.defaultMinStay,
 minStayThrough: preset.defaultMinStay,
 scope: preset.defaultStopSellOta ? "OTA_ONLY" : "ALL_CHANNELS",
 isActive: true,
 syncedToChannex: true,
 syncedToDirect: true,
 updatedAtIso: new Date().toISOString(),
 });
 setModalOpen(true);
 };

 const handleEmergencyToggle = () => {
 const nextState = !emergencyActive;
 setEmergencyActive(nextState);
 onEmergencyStopSellAll?.(nextState);
 };

 return (
 <GlassCard className={`p-6 rounded-2xl apple-liquid-glass space-y-6 ${className}`}>
 {/* 1. Header Toolbar with Emergency Stop-Sell */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
 <div>
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
 <h2 className="text-lg font-bold text-slate-900 ">
 Instant Stop-Sell &amp; MinLOS Quick Bar
 </h2>
 <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold tabular-nums-lkr">
 {activeCount} Active Rules
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-1 max-w-xl">
 Push instant real-time rate restrictions, minimum stays, and stop-sells to Channex
 (OTAs) and the Direct Booking Engine.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2.5">
 {/* Emergency Stop-Sell Button */}
 <button
 type="button"
 onClick={handleEmergencyToggle}
 className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-2 min-h-[44px] ${
 emergencyActive
 ? "bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse"
 : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/30"
 }`}
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
 />
 </svg>
 <span>
 {emergencyActive ? "Emergency Stop-Sell Active" : "Emergency Stop-Sell All"}
 </span>
 </button>

 {/* New Rule Action */}
 <button
 type="button"
 onClick={() => {
 setEditingRule(undefined);
 setModalOpen(true);
 }}
 className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 4v16m8-8H4"
 />
 </svg>
 <span>Add Restriction</span>
 </button>
 </div>
 </div>

 {/* 2. Sri Lankan Holiday Presets Carousel */}
 <PresetsCarousel onSelectPreset={handleSelectPreset} />

 {/* 3. Active Restrictions List */}
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-700 ">
 Active Distribution Rules ({rules.length}):
 </span>
 <span className="text-slate-400">
 {stopSellCount} Stop-Sell • {activeCount - stopSellCount} MinLOS
 </span>
 </div>

 {rules.length === 0 ? (
 <div className="p-8 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-300 ">
 No active restrictions. All inventory is open with 1-night minimum stay.
 </div>
 ) : (
 <div className="space-y-2.5">
 {rules.map((rule) => (
 <RestrictionRow
 key={rule.id}
 rule={rule}
 onToggle={handleToggle}
 onDelete={handleDelete}
 onEdit={(r) => {
 setEditingRule(r);
 setModalOpen(true);
 }}
 />
 ))}
 </div>
 )}
 </div>

 {/* Modal Editor */}
 <RestrictionEditorModal
 isOpen={modalOpen}
 onClose={() => setModalOpen(false)}
 initialRule={editingRule}
 onSave={handleSave}
 />
 </GlassCard>
 );
}
