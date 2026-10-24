import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Breakage & Damaged Glassware / Linen Ledger Modal (`BreakageRegisterModal.tsx`)
 *
 * Implements Step 433 (Phase 18.08) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Itemizes broken wine glasses, plates, and lost pool towels charged against the permitted
 * Service Charge breakage allowance (capped at maximum 10% statutory limit).
 * - Provides full audit transparency so staff representatives and hotel committees can audit
 * every deduction line with supervisor and staff rep verification signatures.
 * - Enforces Apple HIG Liquid Glass aesthetics (`.apple-liquid-glass`), SF Pro typography,
 * `.tabular-nums-lkr` alignment, and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr, roundLkr } from "./ServiceChargePoolView.js";
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Breakage asset categories for hotel food, beverage, and housekeeping items.
 */
export type BreakageItemCategory =
 | "GLASSWARE"
 | "CROCKERY"
 | "CUTLERY"
 | "LINEN"
 | "KITCHEN_EQUIPMENT"
 | "OTHER";

/**
 * Individual recorded breakage or linen loss line item.
 */
export interface BreakageIncident {
 readonly id: string;
 readonly date: string; // YYYY-MM-DD
 readonly itemDescription: string;
 readonly category: BreakageItemCategory;
 readonly department: DepartmentKey;
 readonly location: string; // e.g. "Pool Bar", "Main Dining Room", "Banquet Hall"
 readonly quantity: number;
 readonly unitCostLkr: number;
 readonly totalCostLkr: number; // quantity * unitCostLkr
 readonly reportedByName: string;
 readonly reportedByEpf: string;
 readonly supervisorVerified: boolean;
 readonly staffRepVerified: boolean;
 readonly notes: string;
}

/**
 * Audit summary for the monthly breakage ledger.
 */
export interface BreakageLedgerSummary {
 readonly totalIncidents: number;
 readonly totalItemsCount: number;
 readonly totalBreakageCostLkr: number;
 readonly scBreakageAllowanceLkr: number;
 readonly varianceLkr: number;
 readonly verifiedLinesCount: number;
}

/**
 * Category metadata for badges and visual styling.
 */
export interface BreakageCategoryDefinition {
 readonly category: BreakageItemCategory;
 readonly label: string;
 readonly color: StatusColor;
 readonly icon: string;
}

export const BREAKAGE_CATEGORY_DEFINITIONS: Record<
 BreakageItemCategory,
 BreakageCategoryDefinition
> = {
 GLASSWARE: {
 category: "GLASSWARE",
 label: "Glassware",
 color: "blue",
 icon: "Wine",
 },
 CROCKERY: {
 category: "CROCKERY",
 label: "Crockery / Plates",
 color: "amber",
 icon: "Dining",
 },
 CUTLERY: {
 category: "CUTLERY",
 label: "Cutlery",
 color: "gray",
 icon: "Fork",
 },
 LINEN: {
 category: "LINEN",
 label: "Linen & Towels",
 color: "indigo",
 icon: "Laundry",
 },
 KITCHEN_EQUIPMENT: {
 category: "KITCHEN_EQUIPMENT",
 label: "Kitchen Equipment",
 color: "red",
 icon: "Kitchen",
 },
 OTHER: {
 category: "OTHER",
 label: "Other Assets",
 color: "gray",
 icon: "Box",
 },
};

/**
 * Filter predicate helper function to avoid excessive cognitive complexity.
 */
export function matchesBreakageFilters(
 incident: BreakageIncident,
 categoryFilter: BreakageItemCategory | "ALL",
 departmentFilter: DepartmentKey | "ALL",
 searchQuery: string,
): boolean {
 if (categoryFilter !== "ALL" && incident.category !== categoryFilter) {
 return false;
 }
 if (departmentFilter !== "ALL" && incident.department !== departmentFilter) {
 return false;
 }

 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const matchesItem = incident.itemDescription.toLowerCase().includes(query);
 const matchesLocation = incident.location.toLowerCase().includes(query);
 const matchesStaff = incident.reportedByName.toLowerCase().includes(query);
 const matchesEpf = incident.reportedByEpf.toLowerCase().includes(query);
 return matchesItem || matchesLocation || matchesStaff || matchesEpf;
 }

 return true;
}

/**
 * Computes summary metrics for a list of breakage incidents against the SC deduction allowance.
 */
export function calculateBreakageSummary(
 incidents: readonly BreakageIncident[],
 scBreakageAllowanceLkr: number,
): BreakageLedgerSummary {
 const totalIncidents = incidents.length;
 let totalItemsCount = 0;
 let totalBreakageCostLkr = 0;
 let verifiedLinesCount = 0;

 for (const inc of incidents) {
 totalItemsCount += inc.quantity;
 totalBreakageCostLkr += inc.totalCostLkr;
 if (inc.supervisorVerified && inc.staffRepVerified) {
 verifiedLinesCount += 1;
 }
 }

 const roundedTotalCost = roundLkr(totalBreakageCostLkr);
 const varianceLkr = roundLkr(scBreakageAllowanceLkr - roundedTotalCost);

 return {
 totalIncidents,
 totalItemsCount,
 totalBreakageCostLkr: roundedTotalCost,
 scBreakageAllowanceLkr: roundLkr(scBreakageAllowanceLkr),
 varianceLkr,
 verifiedLinesCount,
 };
}

/**
 * Standard pre-loaded breakage ledger incidents for demonstration and testing.
 */
export const DEFAULT_BREAKAGE_INCIDENTS: readonly BreakageIncident[] = [
 {
 id: "brk-001",
 date: "2026-10-04",
 itemDescription: "Schott Zwiesel Crystal Red Wine Glasses",
 category: "GLASSWARE",
 department: "RESTAURANT",
 location: "Fine Dining Restaurant",
 quantity: 6,
 unitCostLkr: 3250.0,
 totalCostLkr: 19500.0,
 reportedByName: "Roshan Wickramasinghe",
 reportedByEpf: "EPF-1115",
 supervisorVerified: true,
 staffRepVerified: true,
 notes: "Dropped during Saturday dinner rush bus-tub transport",
 },
 {
 id: "brk-002",
 date: "2026-10-08",
 itemDescription: "Noritake Porcelain Dinner Plates (27cm Gold Rim)",
 category: "CROCKERY",
 department: "KITCHEN",
 location: "Main Hot Kitchen (Plating Pass)",
 quantity: 8,
 unitCostLkr: 4100.0,
 totalCostLkr: 32800.0,
 reportedByName: "Chef Nuwan Gunasekara",
 reportedByEpf: "EPF-1088",
 supervisorVerified: true,
 staffRepVerified: true,
 notes: "Chipped on pass heat lamp rack during VIP banquet plating",
 },
 {
 id: "brk-003",
 date: "2026-10-12",
 itemDescription: "Luxury Pool Towels (Blue/White Stripe 700 GSM)",
 category: "LINEN",
 department: "HOUSEKEEPING",
 location: "Beach Cabana Towel Desk",
 quantity: 12,
 unitCostLkr: 2850.0,
 totalCostLkr: 34200.0,
 reportedByName: "Anusha Damayanthi",
 reportedByEpf: "EPF-1140",
 supervisorVerified: true,
 staffRepVerified: true,
 notes: "Unreturned by non-resident pool day-pass visitors",
 },
 {
 id: "brk-004",
 date: "2026-10-15",
 itemDescription: "Pilsner Beer Glasses (Craft Tap Draft)",
 category: "GLASSWARE",
 department: "RESTAURANT",
 location: "Lagoon Bar & Lounge",
 quantity: 10,
 unitCostLkr: 1450.0,
 totalCostLkr: 14500.0,
 reportedByName: "Pradeep Kumara",
 reportedByEpf: "EPF-1190",
 supervisorVerified: true,
 staffRepVerified: true,
 notes: "Bar dishwashing basket thermal shock breakage",
 },
 {
 id: "brk-005",
 date: "2026-10-18",
 itemDescription: "Heavy Stainless Steel Table Spoons & Forks (18/10)",
 category: "CUTLERY",
 department: "RESTAURANT",
 location: "Garden Buffet Lawn",
 quantity: 15,
 unitCostLkr: 850.0,
 totalCostLkr: 12750.0,
 reportedByName: "Roshan Wickramasinghe",
 reportedByEpf: "EPF-1115",
 supervisorVerified: true,
 staffRepVerified: true,
 notes: "Lost during outdoor beach lawn barbecue event",
 },
 {
 id: "brk-006",
 date: "2026-10-19",
 itemDescription: "Robot Coupe Immersion Blender Whisk Attachment",
 category: "KITCHEN_EQUIPMENT",
 department: "KITCHEN",
 location: "Pastry Kitchen",
 quantity: 1,
 unitCostLkr: 28000.0,
 totalCostLkr: 28000.0,
 reportedByName: "Malik Perera",
 reportedByEpf: "EPF-1102",
 supervisorVerified: true,
 staffRepVerified: false,
 notes: "Internal gear teeth stripped during thick ganache preparation",
 },
];

/**
 * Segmented control category options.
 */
export const BREAKAGE_FILTER_OPTIONS: readonly SegmentedControlOption<
 BreakageItemCategory | "ALL"
>[] = [
 { id: "ALL", label: "All Items" },
 { id: "GLASSWARE", label: "Glassware" },
 { id: "CROCKERY", label: "Crockery" },
 { id: "LINEN", label: "Linen" },
 { id: "CUTLERY", label: "Cutlery" },
 { id: "KITCHEN_EQUIPMENT", label: "Kitchen" },
];

export interface BreakageRegisterModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly initialIncidents?: readonly BreakageIncident[];
 readonly scBreakageAllowanceLkr?: number;
 readonly onSaveIncidents?: (incidents: readonly BreakageIncident[]) => void;
}

/**
 * Extracted incident table row subcomponent to keep cognitive complexity low and maintainable.
 */
interface IncidentRowProps {
 readonly incident: BreakageIncident;
 readonly onToggleStaffRepSign: (id: string) => void;
}

function IncidentRow({ incident, onToggleStaffRepSign }: IncidentRowProps) {
 const catDef = BREAKAGE_CATEGORY_DEFINITIONS[incident.category];

 return (
 <tr className="hover:bg-neutral-50/50 transition-colors">
 {/* Date */}
 <td className="px-4 py-3 tabular-nums-lkr text-xs text-neutral-500 font-medium whitespace-nowrap">
 {incident.date}
 </td>

 {/* Item & Details */}
 <td className="px-4 py-3">
 <div className="font-medium text-neutral-900 flex items-center gap-1.5">
 <span><DynamicTokenIcon token={catDef.icon} /></span>
 <span>{incident.itemDescription}</span>
 </div>
 <div className="text-xs text-neutral-400 mt-0.5">
 {incident.location} • <span className="italic">{incident.notes}</span>
 </div>
 </td>

 {/* Category */}
 <td className="px-4 py-3">
 <StatusBadge
 status={incident.category}
 color={catDef.color}
 label={catDef.label}
 size="sm"
 />
 </td>

 {/* Department */}
 <td className="px-4 py-3 text-xs text-neutral-600 font-medium">
 {incident.department.replace("_", " ")}
 </td>

 {/* Qty & Unit Cost */}
 <td className="px-4 py-3 text-center tabular-nums-lkr text-xs text-neutral-700 ">
 <span className="font-bold">{incident.quantity}</span> × {formatLkr(incident.unitCostLkr)}
 </td>

 {/* Total Deducted Cost */}
 <td className="px-4 py-3 text-right tabular-nums-lkr">
 <span className="font-bold text-apple-amber text-sm">
 {formatLkr(incident.totalCostLkr)}
 </span>
 </td>

 {/* Staff Committee Audit Signature */}
 <td className="px-4 py-3 text-center">
 <button
 type="button"
 onClick={() => onToggleStaffRepSign(incident.id)}
 className={`px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 incident.staffRepVerified
 ? "bg-[#0B6E4F]/15 text-apple-green border border-apple-green/30"
 : "bg-apple-amber/15 text-amber-700 border border-amber-500/30"
 }`}
 title="Click to toggle Staff Representative committee audit approval"
 >
 {incident.staffRepVerified ? "Staff Rep Signed" : "Pending Sign"}
 </button>
 </td>
 </tr>
 );
}

/**
 * Breakage & Damaged Glassware / Linen Ledger Modal Component
 */
export function BreakageRegisterModal({
 isOpen,
 onClose,
 initialIncidents = DEFAULT_BREAKAGE_INCIDENTS,
 scBreakageAllowanceLkr = 172500.0, // Default 5% of LKR 3,450,000 SC
 onSaveIncidents,
}: BreakageRegisterModalProps) {
 const searchId = useId();
 const [incidents, setIncidents] = useState<readonly BreakageIncident[]>(initialIncidents);
 const [selectedCategory, setSelectedCategory] = useState<BreakageItemCategory | "ALL">("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [isAddFormOpen, setIsAddFormOpen] = useState(false);

 // New incident form state
 const [newItemDesc, setNewItemDesc] = useState("");
 const [newItemCategory, setNewItemCategory] = useState<BreakageItemCategory>("GLASSWARE");
 const [newItemDept, setNewItemDept] = useState<DepartmentKey>("RESTAURANT");
 const [newItemLocation, setNewItemLocation] = useState("Main Restaurant");
 const [newItemQty, setNewItemQty] = useState(1);
 const [newItemUnitCost, setNewItemUnitCost] = useState(1500);
 const [newItemNotes, setNewItemNotes] = useState("");

 // Summary calculation
 const summary = useMemo(
 () => calculateBreakageSummary(incidents, scBreakageAllowanceLkr),
 [incidents, scBreakageAllowanceLkr],
 );

 // Filtered list
 const filteredIncidents = useMemo(() => {
 return incidents.filter((inc) =>
 matchesBreakageFilters(inc, selectedCategory, "ALL", searchQuery),
 );
 }, [incidents, selectedCategory, searchQuery]);

 // Toggle staff representative signature
 const handleToggleStaffRepSign = (id: string) => {
 const updated = incidents.map((inc) =>
 inc.id === id ? { ...inc, staffRepVerified: !inc.staffRepVerified } : inc,
 );
 setIncidents(updated);
 if (onSaveIncidents) {
 onSaveIncidents(updated);
 }
 };

 // Add new breakage incident
 const handleAddIncident = () => {
 if (!newItemDesc.trim()) return;

 const safeQty = Math.max(1, newItemQty);
 const safeUnitCost = Math.max(0, roundLkr(newItemUnitCost));
 const totalCost = roundLkr(safeQty * safeUnitCost);

 const now = new Date();
 const dateStr = now.toISOString().split("T")[0] ?? "2026-10-21";

 const newInc: BreakageIncident = {
 id: `brk-${Date.now()}`,
 date: dateStr,
 itemDescription: newItemDesc.trim(),
 category: newItemCategory,
 department: newItemDept,
 location: newItemLocation.trim() || "Main Restaurant",
 quantity: safeQty,
 unitCostLkr: safeUnitCost,
 totalCostLkr: totalCost,
 reportedByName: "Duty Manager",
 reportedByEpf: "EPF-MGR",
 supervisorVerified: true,
 staffRepVerified: false,
 notes: newItemNotes.trim() || "Physical breakage verified by duty supervisor",
 };

 const updated = [newInc, ...incidents];
 setIncidents(updated);
 setIsAddFormOpen(false);
 setNewItemDesc("");
 setNewItemNotes("");

 if (onSaveIncidents) {
 onSaveIncidents(updated);
 }
 };

 if (!isOpen) return null;

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="breakage-modal-title"
 className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md border-none w-full h-full max-w-none max-h-none m-0 overflow-y-auto"
 >
 <div className="relative w-full max-w-5xl rounded-2xl apple-liquid-glass p-5 md:p-7 shadow-2xl border border-[#E2E8F0] my-auto">
 {/* Modal Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-neutral-200/80 ">
 <div>
 <div className="flex items-center gap-2.5">
 <h2
 id="breakage-modal-title"
 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 "
 >
 Breakage & Damaged Linen Audit Ledger
 </h2>
 <span className="text-xs px-2.5 py-0.5 rounded-full bg-apple-amber/15 text-amber-700 font-medium border border-amber-500/30">
 Phase 18.08
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1">
 Itemized physical breakage register backing the monthly 10% Service Charge deduction
 (Max Capped at 10%)
 </p>
 </div>

 <div className="flex items-center gap-2.5 self-end sm:self-center">
 <button
 type="button"
 onClick={() => setIsAddFormOpen(!isAddFormOpen)}
 className="px-3.5 py-2 min-h-[44px] rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
 >
 {isAddFormOpen ? "x Close Form" : "+ Record Breakage"}
 </button>
 <button
 type="button"
 onClick={onClose}
 className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
 aria-label="Close Breakage Modal"
 >
 x
 </button>
 </div>
 </div>

 {/* Bento Summary: Allowance vs Actual Audited Breakage */}
 <section
 className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
 aria-label="Breakage Audit Metrics"
 >
 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">SC Breakage Allowance</span>
 <div className="mt-1">
 <span className="text-lg font-bold text-neutral-900 tabular-nums-lkr block">
 {formatLkr(summary.scBreakageAllowanceLkr)}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">Permitted 5.0% SC Pool Cap</span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">Total Audited Breakage</span>
 <div className="mt-1">
 <span className="text-lg font-bold text-apple-amber tabular-nums-lkr block">
 {formatLkr(summary.totalBreakageCostLkr)}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">
 {summary.totalItemsCount} Physical Items Broken
 </span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between border-apple-green/30 bg-[#0B6E4F]/5">
 <span className="text-[11px] font-medium text-apple-green">
 Unused Allowance (Staff Surplus)
 </span>
 <div className="mt-1">
 <span className="text-lg font-bold text-apple-green tabular-nums-lkr block">
 {formatLkr(Math.max(0, summary.varianceLkr))}
 </span>
 </div>
 <span className="text-[10px] text-neutral-500">Reverts to Staff SC Pool</span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">Staff Committee Audit</span>
 <div className="mt-1">
 <span className="text-lg font-bold text-[#0B6E4F] tabular-nums-lkr block">
 {summary.verifiedLinesCount} / {summary.totalIncidents}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">Countersigned Lines</span>
 </GlassCard>
 </section>

 {/* Inline Add Breakage Form */}
 {isAddFormOpen && (
 <div className="p-4 rounded-2xl bg-neutral-100/90 border border-neutral-300/80 mb-4 space-y-3">
 <h3 className="text-sm font-semibold text-neutral-900 ">
 Record New Breakage / Damaged Linen Line
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div>
 <label
 htmlFor="brk-desc"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Item Description:
 </label>
 <input
 id="brk-desc"
 type="text"
 value={newItemDesc}
 onChange={(e) => setNewItemDesc(e.target.value)}
 placeholder="e.g. Cocktail Glasses (Martini Coupette)"
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 />
 </div>

 <div>
 <label
 htmlFor="brk-cat"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Category:
 </label>
 <select
 id="brk-cat"
 value={newItemCategory}
 onChange={(e) => setNewItemCategory(e.target.value as BreakageItemCategory)}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 >
 <option value="GLASSWARE">Glassware</option>
 <option value="CROCKERY">Crockery / Plates</option>
 <option value="LINEN">Linen & Towels</option>
 <option value="CUTLERY">Cutlery</option>
 <option value="KITCHEN_EQUIPMENT">Kitchen Equipment</option>
 <option value="OTHER">Other Assets</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="brk-dept"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Department:
 </label>
 <select
 id="brk-dept"
 value={newItemDept}
 onChange={(e) => setNewItemDept(e.target.value as DepartmentKey)}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 >
 <option value="RESTAURANT">Restaurant / F&B</option>
 <option value="KITCHEN">Kitchen</option>
 <option value="HOUSEKEEPING">Housekeeping</option>
 <option value="FRONT_DESK">Front Desk</option>
 <option value="MAINTENANCE">Maintenance</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="brk-qty"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Broken Quantity:
 </label>
 <input
 id="brk-qty"
 type="number"
 min="1"
 value={newItemQty}
 onChange={(e) => setNewItemQty(Number(e.target.value))}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 tabular-nums-lkr"
 />
 </div>

 <div>
 <label
 htmlFor="brk-cost"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Unit Replacement Cost (LKR):
 </label>
 <input
 id="brk-cost"
 type="number"
 min="0"
 step="50"
 value={newItemUnitCost}
 onChange={(e) => setNewItemUnitCost(Number(e.target.value))}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 tabular-nums-lkr"
 />
 </div>

 <div>
 <label
 htmlFor="brk-loc"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Location / Outlet:
 </label>
 <input
 id="brk-loc"
 type="text"
 value={newItemLocation}
 onChange={(e) => setNewItemLocation(e.target.value)}
 placeholder="e.g. Pool Deck Bar"
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsAddFormOpen(false)}
 className="px-3 py-2 min-h-[40px] rounded-xl text-xs text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleAddIncident}
 className="px-4 py-2 min-h-[40px] rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
 >
 Save Breakage Entry
 </button>
 </div>
 </div>
 )}

 {/* Filter Toolbar: Category & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
 <SegmentedControl
 options={BREAKAGE_FILTER_OPTIONS}
 value={selectedCategory}
 onChange={(cat) => setSelectedCategory(cat)}
 ariaLabel="Breakage category filter"
 size="sm"
 />

 <div className="relative w-full sm:w-64">
 <label htmlFor={searchId} className="sr-only">
 Search breakage items
 </label>
 <input
 id={searchId}
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search item, location, staff..."
 className="w-full px-3 py-2 pl-8 min-h-[40px] rounded-xl text-xs bg-neutral-100 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-apple-blue/50 text-neutral-900 placeholder-neutral-400 transition-all"
 />
 <svg
 className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 </div>

 {/* Breakage Ledger Table */}
 <GlassCard className="p-0 overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead className="sticky top-0 z-10 bg-neutral-50/90 backdrop-blur-md">
 <tr className="border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
 <th scope="col" className="px-4 py-3">
 Date
 </th>
 <th scope="col" className="px-4 py-3">
 Item Description & Location
 </th>
 <th scope="col" className="px-4 py-3">
 Category
 </th>
 <th scope="col" className="px-4 py-3">
 Department
 </th>
 <th scope="col" className="px-4 py-3 text-center">
 Qty × Cost
 </th>
 <th scope="col" className="px-4 py-3 text-right">
 Total (LKR)
 </th>
 <th scope="col" className="px-4 py-3 text-center">
 Committee Sign
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60 ">
 {filteredIncidents.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-6 py-10 text-center text-xs text-neutral-400">
 No breakage incidents match the selected filter.
 </td>
 </tr>
 ) : (
 filteredIncidents.map((incident) => (
 <IncidentRow
 key={incident.id}
 incident={incident}
 onToggleStaffRepSign={handleToggleStaffRepSign}
 />
 ))
 )}
 </tbody>
 </table>
 </GlassCard>

 {/* Statutory Compliance Footer Notice */}
 <div className="mt-4 pt-3 border-t border-neutral-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-neutral-500 ">
 <div>
 <span>Verified by: </span>
 <strong className="text-neutral-700 ">
 Hotel Staff Committee & F&B Cost Controller
 </strong>
 </div>
 <div>
 <span>Statutory Cap: </span>
 <strong className="text-apple-amber">Maximum 10% of Gross SC Pool</strong>
 </div>
 </div>
 </div>
 </dialog>
 );
}
