import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { DEFAULT_DMC_CONTRACTS, type DmcContract } from "./DmcContractManager.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type FolioRoutingMode = "DMC_MASTER_SPLIT" | "GROUP_MASTER_ALL" | "INDIVIDUAL_FOLIOS";

export interface RoomingListEntry {
 readonly id: string;
 readonly rowNumber: number;
 readonly roomNumber: string;
 readonly primaryGuestName: string;
 readonly secondaryGuestName?: string | undefined;
 readonly identityDocument?: string | undefined;
 readonly nationality: string;
 readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
 readonly specialRequests?: string | undefined;
 readonly isValid: boolean;
 readonly validationError?: string | undefined;
}

export interface GroupRoomingImportResult {
 readonly groupName: string;
 readonly groupReference: string;
 readonly dmcContractId?: string | undefined;
 readonly folioRouting: FolioRoutingMode;
 readonly entries: ReadonlyArray<RoomingListEntry>;
 readonly validCount: number;
 readonly invalidCount: number;
 readonly totalRooms: number;
 readonly totalGuests: number;
}

export interface AvailableRoomOption {
 readonly id: string;
 readonly roomNumber: string;
 readonly roomTypeName: string;
 readonly isAvailable: boolean;
}

export interface GroupRoomingModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onConfirmImport?:
 | ((result: GroupRoomingImportResult) => void | Promise<void>)
 | undefined;
 readonly dmcContracts?: ReadonlyArray<DmcContract> | undefined;
 readonly initialGroupName?: string | undefined;
 readonly initialGroupReference?: string | undefined;
 readonly initialDmcContractId?: string | undefined;
 readonly disabled?: boolean | undefined;
}

// ============================================================================
// Sample 15-Room Tour Bus Rooming List Preset
// ============================================================================

export const SAMPLE_15_ROOM_TOUR_ROSTER = `Room,Primary Guest,Secondary Guest,Passport,Nationality,Meal Plan,Notes
101,Arthur Pendelton,Clara Pendelton,GB-9841204,British,HB,Twin beds requested
102,David Miller,Susan Miller,GB-5421980,British,HB,Quiet room away from elevator
103,Hans Becker,Greta Becker,DE-C194821,German,FB,Dietary: Vegetarian meals
104,Jurgen Klopp,Emma Klopp,DE-C782190,German,FB,Extra towels
105,Michel Dubois,Sophie Dubois,FR-8821904,French,HB,Ground floor preferred
106,Pierre Moreau,,FR-1940294,French,HB,Single occupancy
107,Lars Nilsson,Astrid Nilsson,SE-9948210,Swedish,AI,Honeymoon anniversary setup
108,Erik Lindqvist,Karin Lindqvist,SE-7741209,Swedish,AI,Connecting with 107
109,James Wilson,Emily Wilson,AU-P448219,Australian,HB,Early wake-up call 05:30
110,Liam O'Connor,Fiona O'Connor,IE-8492014,Irish,HB,Late check-out request
111,Kenji Sato,Yoko Sato,JP-TK99821,Japanese,BB,High floor room
112,Alessandro Rossi,Chiara Rossi,IT-YA48219,Italian,HB,Coffee maker in room
113,Marco Bianchi,,IT-YA88412,Italian,HB,Single occupancy
114,Viktor Petrov,Elena Petrova,RU-8841920,Russian,FB,Baby cot needed
115,Dmitry Ivanov,Anna Ivanova,RU-9921480,Russian,FB,Safari excursion booked`;

// ============================================================================
// Zero-Dependency Rooming List Parser
// ============================================================================

function cleanCell(cell: string): string {
 return cell
 .trim()
 .replace(/^["']|["']$/g, "")
 .trim();
}

function parseMealPlan(
 raw: string | undefined,
 fallback: "RO" | "BB" | "HB" | "FB" | "AI",
): "RO" | "BB" | "HB" | "FB" | "AI" {
 const upper = (raw ?? "").toUpperCase();
 if (upper === "RO" || upper === "BB" || upper === "HB" || upper === "FB" || upper === "AI") {
 return upper;
 }
 return fallback;
}

function parseRoomingLine(
 line: string,
 rowNumber: number,
 defaultMealPlan: "RO" | "BB" | "HB" | "FB" | "AI",
): RoomingListEntry | null {
 const isHeader = /^(room|#|guest|unit)/i.test(line) && /(guest|pax|name)/i.test(line);
 if (isHeader) {
 return null;
 }

 const delimiter = line.includes("\t") ? "\t" : ",";
 const parts = line.split(delimiter).map(cleanCell);

 const roomNumber = parts[0] ?? "";
 const primaryGuestName = parts[1] ?? "";
 const secondaryGuestName = parts[2] ? parts[2] : undefined;
 const identityDocument = parts[3] ? parts[3] : undefined;
 const nationality = parts[4] ? parts[4] : "Foreign";
 const mealPlan = parseMealPlan(parts[5], defaultMealPlan);
 const specialRequests = parts[6] ? parts[6] : undefined;

 const hasRoom = roomNumber.length > 0;
 const hasPrimaryName = primaryGuestName.length > 0;
 const isValid = hasRoom && hasPrimaryName;

 let validationError: string | undefined;
 if (!hasRoom) {
 validationError = "Missing room number";
 } else if (!hasPrimaryName) {
 validationError = "Missing primary guest name";
 }

 return {
 id: `rooming-row-${rowNumber}`,
 rowNumber,
 roomNumber,
 primaryGuestName,
 secondaryGuestName,
 identityDocument,
 nationality,
 mealPlan,
 specialRequests,
 isValid,
 validationError,
 };
}

export function parseRoomingListText(
 rawText: string,
 defaultMealPlan: "RO" | "BB" | "HB" | "FB" | "AI" = "HB",
): {
 readonly entries: ReadonlyArray<RoomingListEntry>;
 readonly validCount: number;
 readonly invalidCount: number;
 readonly totalRooms: number;
 readonly totalGuests: number;
} {
 const lines = rawText
 .split(/\r?\n/)
 .map((l) => l.trim())
 .filter(Boolean);
 if (lines.length === 0) {
 return {
 entries: [],
 validCount: 0,
 invalidCount: 0,
 totalRooms: 0,
 totalGuests: 0,
 };
 }

 const entries: RoomingListEntry[] = [];
 let rowCounter = 0;
 let totalGuests = 0;

 for (const line of lines) {
 rowCounter += 1;
 const entry = parseRoomingLine(line, rowCounter, defaultMealPlan);
 if (!entry) {
 continue;
 }
 if (entry.isValid) {
 totalGuests += entry.secondaryGuestName ? 2 : 1;
 }
 entries.push(entry);
 }

 const validCount = entries.filter((e) => e.isValid).length;

 return {
 entries,
 validCount,
 invalidCount: entries.length - validCount,
 totalRooms: validCount,
 totalGuests,
 };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface GroupHeaderInputsProps {
 readonly groupName: string;
 readonly groupRef: string;
 readonly dmcId: string;
 readonly contracts: ReadonlyArray<DmcContract>;
 readonly disabled: boolean;
 readonly onGroupNameChange: (val: string) => void;
 readonly onGroupRefChange: (val: string) => void;
 readonly onDmcChange: (val: string) => void;
}

function GroupHeaderInputs({
 groupName,
 groupRef,
 dmcId,
 contracts,
 disabled,
 onGroupNameChange,
 onGroupRefChange,
 onDmcChange,
}: GroupHeaderInputsProps) {
 const nameId = useId();
 const refId = useId();
 const dmcSelectId = useId();

 return (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label
 htmlFor={nameId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Tour Series / Group Name *
 </label>
 <input
 id={nameId}
 type="text"
 value={groupName}
 disabled={disabled}
 onChange={(e) => onGroupNameChange(e.target.value)}
 placeholder="e.g. TUI Discovery Tour Group A"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 text-slate-900 min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor={refId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Tour Reference / Booking Code *
 </label>
 <input
 id={refId}
 type="text"
 value={groupRef}
 disabled={disabled}
 onChange={(e) => onGroupRefChange(e.target.value)}
 placeholder="e.g. TUI-SL-2026-OCT-12"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 font-mono uppercase min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor={dmcSelectId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Associated Tour Operator (DMC)
 </label>
 <select
 id={dmcSelectId}
 value={dmcId}
 disabled={disabled}
 onChange={(e) => onDmcChange(e.target.value)}
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 text-slate-900 min-h-[44px]"
 >
 <option value="">-- Direct Hotel Group (No DMC) --</option>
 {contracts.map((c) => (
 <option key={c.id} value={c.id}>
 {c.companyName} ({c.contractCode})
 </option>
 ))}
 </select>
 </div>
 </div>
 );
}

interface RoomingPasteAreaProps {
 readonly rawText: string;
 readonly disabled: boolean;
 readonly onTextChange: (text: string) => void;
 readonly onLoadSample: () => void;
}

function RoomingPasteArea({
 rawText,
 disabled,
 onTextChange,
 onLoadSample,
}: RoomingPasteAreaProps) {
 const pasteId = useId();

 return (
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <label htmlFor={pasteId} className="font-medium text-slate-700 ">
 Paste CSV or Excel Table (Room, Primary Guest, Secondary Guest, Passport, Nationality,
 Meal Plan, Notes)
 </label>
 <button
 type="button"
 disabled={disabled}
 onClick={onLoadSample}
 className="text-blue-600 hover:underline font-medium min-h-[32px] px-2 py-1 rounded"
 >
 Load 15-Room Tour Bus Sample
 </button>
 </div>

 <textarea
 id={pasteId}
 value={rawText}
 disabled={disabled}
 rows={5}
 onChange={(e) => onTextChange(e.target.value)}
 placeholder="101, Arthur Pendelton, Clara Pendelton, GB-9841204, British, HB, Twin beds requested&#10;102, David Miller, Susan Miller, GB-5421980, British, HB, Quiet room"
 className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 bg-white/70 text-slate-900 leading-relaxed resize-y min-h-[110px]"
 />
 </div>
 );
}

interface RoomingPreviewTableProps {
 readonly entries: ReadonlyArray<RoomingListEntry>;
}

function RoomingPreviewTable({ entries }: RoomingPreviewTableProps) {
 if (entries.length === 0) return null;

 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-800 ">
 Parsed Room Allocations Preview ({entries.length} items)
 </span>
 <span className="text-slate-500 text-[11px]">
 Scroll to verify guest identity & meal plans
 </span>
 </div>

 <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white/50 ">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-100/60 sticky top-0">
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">Room</th>
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">
 Primary Guest
 </th>
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">
 Secondary Guest
 </th>
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">
 Passport / NIC
 </th>
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">Plan</th>
 <th className="py-2 px-2.5 font-semibold text-slate-600 ">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {entries.map((entry) => (
 <tr
 key={entry.id}
 className={
 entry.isValid
 ? "hover:bg-blue-50/30 "
 : "bg-red-50/30 "
 }
 >
 <td className="py-2 px-2.5 font-bold font-mono text-slate-900 ">
 {entry.roomNumber}
 </td>
 <td className="py-2 px-2.5 font-medium text-slate-800 ">
 {entry.primaryGuestName}
 </td>
 <td className="py-2 px-2.5 text-slate-600 ">
 {entry.secondaryGuestName || "—"}
 </td>
 <td className="py-2 px-2.5 font-mono text-slate-500 text-[11px]">
 {entry.identityDocument || "—"}
 </td>
 <td className="py-2 px-2.5 font-mono font-medium text-blue-600 ">
 {entry.mealPlan}
 </td>
 <td className="py-2 px-2.5">
 <StatusBadge
 status={entry.isValid ? "VALID" : "INVALID"}
 label={entry.isValid ? "Ready" : entry.validationError}
 color={entry.isValid ? "green" : "red"}
 size="sm"
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function GroupRoomingModal({
 isOpen,
 onClose,
 onConfirmImport,
 dmcContracts = DEFAULT_DMC_CONTRACTS,
 initialGroupName = "TUI Discovery Sri Lanka Tour Group A",
 initialGroupReference = "TUI-SL-2026-OCT-12",
 initialDmcContractId = "dmc-aitken",
 disabled = false,
}: GroupRoomingModalProps) {
 const [groupName, setGroupName] = useState<string>(initialGroupName);
 const [groupRef, setGroupRef] = useState<string>(initialGroupReference);
 const [dmcId, setDmcId] = useState<string>(initialDmcContractId);
 const [rawText, setRawText] = useState<string>(SAMPLE_15_ROOM_TOUR_ROSTER);
 const [routingMode, setRoutingMode] = useState<FolioRoutingMode>("DMC_MASTER_SPLIT");

 const routingOptions: ReadonlyArray<SegmentedControlOption<FolioRoutingMode>> = useMemo(
 () => [
 { id: "DMC_MASTER_SPLIT", label: "DMC Master + Guest Personal Extras" },
 { id: "GROUP_MASTER_ALL", label: "Single Master Folio (All Charges)" },
 { id: "INDIVIDUAL_FOLIOS", label: "Individual Room Folios" },
 ],
 [],
 );

 const parsed = useMemo(() => parseRoomingListText(rawText), [rawText]);

 const handleConfirm = () => {
 const result: GroupRoomingImportResult = {
 groupName: groupName.trim(),
 groupReference: groupRef.trim().toUpperCase(),
 dmcContractId: dmcId || undefined,
 folioRouting: routingMode,
 entries: parsed.entries,
 validCount: parsed.validCount,
 invalidCount: parsed.invalidCount,
 totalRooms: parsed.totalRooms,
 totalGuests: parsed.totalGuests,
 };
 onConfirmImport?.(result);
 onClose();
 };

 const isFormValid =
 groupName.trim().length > 0 &&
 groupRef.trim().length > 0 &&
 parsed.validCount > 0 &&
 parsed.invalidCount === 0;

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title="Multi-Room Group & Round-Tour Rooming List Importer"
 description="Import round-tour rooming rosters in batch, allocate room numbers, and set up automated split folios."
 size="xl"
 footer={
 <div className="flex items-center justify-between w-full">
 <div className="text-xs text-slate-500 font-mono">
 {parsed.validCount > 0 ? (
 <span className="text-emerald-600 font-medium">
 OK {parsed.totalRooms} Rooms ({parsed.totalGuests} Guests) Ready for Batch Allocation
 </span>
 ) : (
 "Paste or load a rooming roster above"
 )}
 </div>

 <div className="flex gap-2">
 <button
 type="button"
 disabled={disabled}
 onClick={onClose}
 className="px-4 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={disabled || !isFormValid}
 onClick={handleConfirm}
 className="px-5 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm min-h-[44px]"
 >
 Allocate {parsed.totalRooms} Rooms ({parsed.totalGuests} Pax)
 </button>
 </div>
 </div>
 }
 >
 <div className="space-y-4">
 <GroupHeaderInputs
 groupName={groupName}
 groupRef={groupRef}
 dmcId={dmcId}
 contracts={dmcContracts}
 disabled={disabled}
 onGroupNameChange={setGroupName}
 onGroupRefChange={setGroupRef}
 onDmcChange={setDmcId}
 />

 <div className="space-y-1.5">
 <span className="text-xs font-medium text-slate-700 block">
 Folio Billing Architecture
 </span>
 <SegmentedControl<FolioRoutingMode>
 value={routingMode}
 onChange={setRoutingMode}
 options={routingOptions}
 size="sm"
 disabled={disabled}
 />
 </div>

 <RoomingPasteArea
 rawText={rawText}
 disabled={disabled}
 onTextChange={setRawText}
 onLoadSample={() => setRawText(SAMPLE_15_ROOM_TOUR_ROSTER)}
 />

 <RoomingPreviewTable entries={parsed.entries} />
 </div>
 </DialogModal>
 );
}
