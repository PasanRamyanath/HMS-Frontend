import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { HousekeepingStatus } from "../../generated/graphql.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface PhysicalRoom {
 readonly id: string;
 readonly roomNumber: string;
 readonly roomTypeId: string;
 readonly roomTypeName: string;
 readonly building: string;
 readonly floor: string;
 readonly isOccupied: boolean;
 readonly housekeepingStatus: HousekeepingStatus;
 readonly isSmokingAllowed: boolean;
 readonly isAccessible: boolean;
 readonly interconnectingRoomId?: string | undefined;
 readonly notes?: string | undefined;
}

export interface BulkCreateRoomConfig {
 readonly prefix: string; // e.g. "" or "Cabana "
 readonly startNumber: number; // e.g. 101 or 1
 readonly endNumber: number; // e.g. 120 or 4
 readonly roomTypeId: string;
 readonly building: string;
 readonly floor: string;
 readonly isSmokingAllowed: boolean;
 readonly isAccessible: boolean;
}

export interface RoomTypeOption {
 readonly id: string;
 readonly name: string;
 readonly code: string;
}

export interface RoomInventoryGridProps {
 readonly initialRooms?: ReadonlyArray<PhysicalRoom> | undefined;
 readonly availableRoomTypes?: ReadonlyArray<RoomTypeOption> | undefined;
 readonly onSaveRooms?: ((rooms: ReadonlyArray<PhysicalRoom>) => Promise<void> | void) | undefined;
 readonly isSaving?: boolean | undefined;
 readonly readOnly?: boolean | undefined;
}

// ============================================================================
// Default Hospitality Presets
// ============================================================================

const DEFAULT_ROOM_TYPES: ReadonlyArray<RoomTypeOption> = [
 { id: "rt-deluxe-ocean", name: "Deluxe Ocean View", code: "DOV" },
 { id: "rt-family-chalet", name: "Family Beach Chalet", code: "FBC" },
 { id: "rt-standard-double", name: "Standard Garden Double", code: "SGD" },
 { id: "rt-pool-cabana", name: "Private Pool Villa Cabana", code: "PVC" },
];

export const DEFAULT_PHYSICAL_ROOMS: ReadonlyArray<PhysicalRoom> = [
 {
 id: "room-101",
 roomNumber: "101",
 roomTypeId: "rt-deluxe-ocean",
 roomTypeName: "Deluxe Ocean View",
 building: "Ocean Wing",
 floor: "1",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.Clean,
 isSmokingAllowed: false,
 isAccessible: true,
 interconnectingRoomId: "room-102",
 notes: "Ground floor oceanfront with ramp access.",
 },
 {
 id: "room-102",
 roomNumber: "102",
 roomTypeId: "rt-deluxe-ocean",
 roomTypeName: "Deluxe Ocean View",
 building: "Ocean Wing",
 floor: "1",
 isOccupied: true,
 housekeepingStatus: HousekeepingStatus.Inspected,
 isSmokingAllowed: false,
 isAccessible: false,
 interconnectingRoomId: "room-101",
 },
 {
 id: "room-103",
 roomNumber: "103",
 roomTypeId: "rt-standard-double",
 roomTypeName: "Standard Garden Double",
 building: "Garden Block",
 floor: "1",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.Dirty,
 isSmokingAllowed: false,
 isAccessible: false,
 },
 {
 id: "room-104",
 roomNumber: "104",
 roomTypeId: "rt-standard-double",
 roomTypeName: "Standard Garden Double",
 building: "Garden Block",
 floor: "1",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.TouchUp,
 isSmokingAllowed: true,
 isAccessible: false,
 },
 {
 id: "room-201",
 roomNumber: "201",
 roomTypeId: "rt-deluxe-ocean",
 roomTypeName: "Deluxe Ocean View",
 building: "Ocean Wing",
 floor: "2",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.Clean,
 isSmokingAllowed: false,
 isAccessible: false,
 },
 {
 id: "room-202",
 roomNumber: "202",
 roomTypeId: "rt-deluxe-ocean",
 roomTypeName: "Deluxe Ocean View",
 building: "Ocean Wing",
 floor: "2",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.OutOfOrder,
 isSmokingAllowed: false,
 isAccessible: false,
 notes: "AC compressor replacement pending.",
 },
 {
 id: "room-cabana-1",
 roomNumber: "Cabana 1",
 roomTypeId: "rt-pool-cabana",
 roomTypeName: "Private Pool Villa Cabana",
 building: "Beachfront Cabanas",
 floor: "Ground",
 isOccupied: true,
 housekeepingStatus: HousekeepingStatus.Inspected,
 isSmokingAllowed: true,
 isAccessible: true,
 },
 {
 id: "room-cabana-2",
 roomNumber: "Cabana 2",
 roomTypeId: "rt-pool-cabana",
 roomTypeName: "Private Pool Villa Cabana",
 building: "Beachfront Cabanas",
 floor: "Ground",
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.Clean,
 isSmokingAllowed: true,
 isAccessible: true,
 },
];

// ============================================================================
// Domain Functions
// ============================================================================

export function getHousekeepingBadgeColor(status: HousekeepingStatus): StatusColor {
 switch (status) {
 case HousekeepingStatus.Clean:
 return "green";
 case HousekeepingStatus.Inspected:
 return "blue";
 case HousekeepingStatus.Dirty:
 case HousekeepingStatus.TouchUp:
 return "amber";
 case HousekeepingStatus.OutOfOrder:
 case HousekeepingStatus.OutOfService:
 return "red";
 case HousekeepingStatus.DoNotDisturb:
 return "indigo";
 }
}

export function generateBulkRooms(
 config: BulkCreateRoomConfig,
 roomTypeName: string,
): ReadonlyArray<PhysicalRoom> {
 const result: PhysicalRoom[] = [];
 const start = Math.min(config.startNumber, config.endNumber);
 const end = Math.max(config.startNumber, config.endNumber);

 for (let num = start; num <= end; num++) {
 const roomNum = `${config.prefix}${num}`;
 result.push({
 id: `room-${roomNum.toLowerCase().replace(/\s+/g, "-")}`,
 roomNumber: roomNum,
 roomTypeId: config.roomTypeId,
 roomTypeName,
 building: config.building.trim(),
 floor: config.floor.trim(),
 isOccupied: false,
 housekeepingStatus: HousekeepingStatus.Clean,
 isSmokingAllowed: config.isSmokingAllowed,
 isAccessible: config.isAccessible,
 });
 }

 return result;
}

export function validateRoom(
 room: Partial<PhysicalRoom>,
 existingRooms: ReadonlyArray<PhysicalRoom>,
 currentRoomId?: string,
): { isValid: boolean; error?: string } {
 if (!room.roomNumber || room.roomNumber.trim().length === 0) {
 return { isValid: false, error: "Room or villa number is required." };
 }

 const normalized = room.roomNumber.trim().toLowerCase();
 const isDuplicate = existingRooms.some(
 (r) => r.id !== currentRoomId && r.roomNumber.trim().toLowerCase() === normalized,
 );

 if (isDuplicate) {
 return { isValid: false, error: `Room "${room.roomNumber}" already exists.` };
 }

 if (!room.building || room.building.trim().length === 0) {
 return { isValid: false, error: "Building or wing is required." };
 }

 if (!room.floor || room.floor.trim().length === 0) {
 return { isValid: false, error: "Floor number is required." };
 }

 if (!room.roomTypeId) {
 return { isValid: false, error: "Assigned room category is required." };
 }

 return { isValid: true };
}

// ============================================================================
// Subcomponent: Room Card
// ============================================================================

interface RoomCardProps {
 readonly room: PhysicalRoom;
 readonly onEdit: (room: PhysicalRoom) => void;
 readonly onDelete: (roomId: string) => void;
 readonly readOnly?: boolean | undefined;
}

function RoomCard({ room, onEdit, onDelete, readOnly }: RoomCardProps) {
 const hkColor = getHousekeepingBadgeColor(room.housekeepingStatus);

 return (
 <GlassCard
 material="regular"
 radius="lg"
 className="p-3.5 flex flex-col justify-between gap-3 transition-apple-spring hover:shadow-md border border-slate-200/70 "
 >
 <div>
 <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/50 ">
 <div>
 <span className="text-lg font-bold text-slate-900 tabular-nums-lkr tracking-tight block">
 {room.roomNumber}
 </span>
 <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[140px]">
 {room.roomTypeName}
 </span>
 </div>

 <div className="flex flex-col items-end gap-1">
 <span
 className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
 room.isOccupied
 ? "bg-rose-500/10 text-rose-600 "
 : "bg-emerald-500/10 text-emerald-600 "
 }`}
 >
 {room.isOccupied ? "Occupied" : "Vacant"}
 </span>
 <StatusBadge
 status={room.housekeepingStatus}
 label={room.housekeepingStatus.replace(/_/g, " ")}
 color={hkColor}
 size="sm"
 />
 </div>
 </div>

 <div className="pt-2 text-xs text-slate-600 space-y-1">
 <div className="flex items-center justify-between text-[11px]">
 <span className="text-slate-500 ">Wing / Floor:</span>
 <span className="font-medium truncate max-w-[120px]">
 {room.building} &bull; L{room.floor}
 </span>
 </div>

 {/* Feature Badges */}
 <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
 {room.isAccessible && (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
 Accessible
 </span>
 )}
 {room.isSmokingAllowed ? (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
 Smoking
 </span>
 ) : (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500 font-medium">
 Non-Smoking
 </span>
 )}
 {room.interconnectingRoomId && (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">
 Interconnecting
 </span>
 )}
 </div>

 {room.notes && (
 <p className="text-[11px] italic text-slate-500 pt-1 line-clamp-1">
 {room.notes}
 </p>
 )}
 </div>
 </div>

 {!readOnly && (
 <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/50 ">
 <button
 type="button"
 onClick={() => onEdit(room)}
 className="text-xs px-2.5 py-1 rounded-lg bg-[#0B6E4F]/10 text-[#0B6E4F] font-medium hover:bg-[#0B6E4F]/20 transition-colors min-h-[32px] cursor-pointer"
 >
 Edit
 </button>
 <button
 type="button"
 onClick={() => onDelete(room.id)}
 className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors min-h-[32px] cursor-pointer"
 aria-label={`Delete room ${room.roomNumber}`}
 >
 Delete
 </button>
 </div>
 )}
 </GlassCard>
 );
}

// ============================================================================
// Subcomponent: Add / Edit Single Room Modal
// ============================================================================

interface SingleRoomModalProps {
 readonly isOpen: boolean;
 readonly initialData: PhysicalRoom | null;
 readonly availableRoomTypes: ReadonlyArray<RoomTypeOption>;
 readonly existingRooms: ReadonlyArray<PhysicalRoom>;
 readonly onClose: () => void;
 readonly onSave: (room: PhysicalRoom) => void;
}

function SingleRoomModal({
 isOpen,
 initialData,
 availableRoomTypes,
 existingRooms,
 onClose,
 onSave,
}: SingleRoomModalProps) {
 const roomNumberId = useId();
 const roomTypeId = useId();
 const buildingId = useId();
 const floorId = useId();
 const hkStatusId = useId();
 const interconnectId = useId();
 const notesId = useId();

 const [roomNumber, setRoomNumber] = useState(() => initialData?.roomNumber ?? "");
 const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(
 () => initialData?.roomTypeId ?? availableRoomTypes[0]?.id ?? "",
 );
 const [building, setBuilding] = useState(() => initialData?.building ?? "Main Wing");
 const [floor, setFloor] = useState(() => initialData?.floor ?? "1");
 const [housekeepingStatus, setHousekeepingStatus] = useState<HousekeepingStatus>(
 () => initialData?.housekeepingStatus ?? HousekeepingStatus.Clean,
 );
 const [isOccupied, setIsOccupied] = useState(() => initialData?.isOccupied ?? false);
 const [isSmokingAllowed, setIsSmokingAllowed] = useState(
 () => initialData?.isSmokingAllowed ?? false,
 );
 const [isAccessible, setIsAccessible] = useState(() => initialData?.isAccessible ?? false);
 const [interconnectingRoomId, setInterconnectingRoomId] = useState(
 () => initialData?.interconnectingRoomId ?? "",
 );
 const [notes, setNotes] = useState(() => initialData?.notes ?? "");
 const [validationError, setValidationError] = useState<string | null>(null);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const rt = availableRoomTypes.find((r) => r.id === selectedRoomTypeId);
 const candidate: PhysicalRoom = {
 id: initialData?.id ?? `room-${roomNumber.trim().toLowerCase().replace(/\s+/g, "-")}`,
 roomNumber: roomNumber.trim(),
 roomTypeId: selectedRoomTypeId,
 roomTypeName: rt?.name ?? "Standard",
 building: building.trim(),
 floor: floor.trim(),
 housekeepingStatus,
 isOccupied,
 isSmokingAllowed,
 isAccessible,
 interconnectingRoomId: interconnectingRoomId.trim() || undefined,
 notes: notes.trim() || undefined,
 };

 const validation = validateRoom(candidate, existingRooms, initialData?.id);
 if (!validation.isValid) {
 setValidationError(validation.error ?? "Invalid room configuration.");
 return;
 }

 setValidationError(null);
 onSave(candidate);
 onClose();
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title={initialData ? `Edit Room ${initialData.roomNumber}` : "Create Physical Room / Villa"}
 description="Configure physical inventory details, floor wing, accessibility, and interconnecting links."
 size="md"
 >
 <form onSubmit={handleSubmit} className="space-y-4 pt-2">
 {validationError && (
 <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 ">
 {validationError}
 </div>
 )}

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={roomNumberId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Room / Villa Number
 </label>
 <input
 id={roomNumberId}
 type="text"
 required
 placeholder="e.g. 101 or Cabana 1"
 value={roomNumber}
 onChange={(e) => setRoomNumber(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor={roomTypeId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Room Type
 </label>
 <select
 id={roomTypeId}
 value={selectedRoomTypeId}
 onChange={(e) => setSelectedRoomTypeId(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 >
 {availableRoomTypes.map((rt) => (
 <option key={rt.id} value={rt.id}>
 {rt.name} ({rt.code})
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={buildingId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Building / Wing
 </label>
 <input
 id={buildingId}
 type="text"
 required
 placeholder="e.g. Ocean Wing"
 value={building}
 onChange={(e) => setBuilding(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor={floorId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Floor Level
 </label>
 <input
 id={floorId}
 type="text"
 required
 placeholder="e.g. 1 or Ground"
 value={floor}
 onChange={(e) => setFloor(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={hkStatusId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Housekeeping Status
 </label>
 <select
 id={hkStatusId}
 value={housekeepingStatus}
 onChange={(e) => setHousekeepingStatus(e.target.value as HousekeepingStatus)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 >
 <option value={HousekeepingStatus.Clean}>Clean &amp; Ready</option>
 <option value={HousekeepingStatus.Inspected}>Inspected</option>
 <option value={HousekeepingStatus.Dirty}>Dirty (Changeover)</option>
 <option value={HousekeepingStatus.TouchUp}>Touch Up</option>
 <option value={HousekeepingStatus.OutOfOrder}>Out of Order</option>
 <option value={HousekeepingStatus.OutOfService}>Out of Service</option>
 </select>
 </div>

 <div>
 <label
 htmlFor={interconnectId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Interconnecting Room ID
 </label>
 <input
 id={interconnectId}
 type="text"
 placeholder="Optional connecting room ID"
 value={interconnectingRoomId}
 onChange={(e) => setInterconnectingRoomId(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>
 </div>

 {/* Toggles */}
 <div className="flex flex-wrap items-center gap-6 pt-1">
 <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={isOccupied}
 onChange={(e) => setIsOccupied(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F]"
 />
 Guest Checked In (Occupied)
 </label>

 <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={isSmokingAllowed}
 onChange={(e) => setIsSmokingAllowed(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F]"
 />
 Smoking Allowed
 </label>

 <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={isAccessible}
 onChange={(e) => setIsAccessible(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F]"
 />
 Accessible (Wheelchair Ramp)
 </label>
 </div>

 <div>
 <label
 htmlFor={notesId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Maintenance &amp; Setup Notes
 </label>
 <input
 id={notesId}
 type="text"
 placeholder="e.g. Lake view, extra luggage rack"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 "
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 ">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
 >
 Save Room
 </button>
 </div>
 </form>
 </DialogModal>
 );
}

// ============================================================================
// Subcomponent: Bulk Room Creation Modal
// ============================================================================

interface BulkCreateModalProps {
 readonly isOpen: boolean;
 readonly availableRoomTypes: ReadonlyArray<RoomTypeOption>;
 readonly onClose: () => void;
 readonly onBulkCreate: (rooms: ReadonlyArray<PhysicalRoom>) => void;
}

function BulkCreateModal({
 isOpen,
 availableRoomTypes,
 onClose,
 onBulkCreate,
}: BulkCreateModalProps) {
 const bulkPrefixId = useId();
 const bulkStartId = useId();
 const bulkEndId = useId();
 const bulkTypeId = useId();
 const bulkBuildingId = useId();
 const bulkFloorId = useId();

 const [prefix, setPrefix] = useState("");
 const [startNumber, setStartNumber] = useState(101);
 const [endNumber, setEndNumber] = useState(110);
 const [roomTypeId, setRoomTypeId] = useState(() => availableRoomTypes[0]?.id ?? "");
 const [building, setBuilding] = useState("Main Wing");
 const [floor, setFloor] = useState("1");
 const [isSmokingAllowed, setIsSmokingAllowed] = useState(false);
 const [isAccessible, setIsAccessible] = useState(false);

 const previewCount = Math.max(0, Math.abs(endNumber - startNumber) + 1);

 const handleGenerate = (e: React.FormEvent) => {
 e.preventDefault();
 const rt = availableRoomTypes.find((r) => r.id === roomTypeId);
 const generated = generateBulkRooms(
 {
 prefix,
 startNumber,
 endNumber,
 roomTypeId,
 building,
 floor,
 isSmokingAllowed,
 isAccessible,
 },
 rt?.name ?? "Standard",
 );
 onBulkCreate(generated);
 onClose();
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title="Bulk Create Room Inventory"
 description="Quickly generate a series of physical rooms (e.g. 101–120 or Cabana 1–4) for a specific wing and floor."
 size="md"
 >
 <form onSubmit={handleGenerate} className="space-y-4 pt-2">
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label
 htmlFor={bulkPrefixId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Prefix (Optional)
 </label>
 <input
 id={bulkPrefixId}
 type="text"
 placeholder="e.g. Cabana "
 value={prefix}
 onChange={(e) => setPrefix(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor={bulkStartId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Start Number
 </label>
 <input
 id={bulkStartId}
 type="number"
 required
 value={startNumber}
 onChange={(e) => setStartNumber(Number.parseInt(e.target.value, 10) || 1)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px] tabular-nums-lkr"
 />
 </div>

 <div>
 <label
 htmlFor={bulkEndId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 End Number
 </label>
 <input
 id={bulkEndId}
 type="number"
 required
 value={endNumber}
 onChange={(e) => setEndNumber(Number.parseInt(e.target.value, 10) || 1)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px] tabular-nums-lkr"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={bulkTypeId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Assign Room Type
 </label>
 <select
 id={bulkTypeId}
 value={roomTypeId}
 onChange={(e) => setRoomTypeId(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 >
 {availableRoomTypes.map((rt) => (
 <option key={rt.id} value={rt.id}>
 {rt.name} ({rt.code})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor={bulkBuildingId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Wing / Building
 </label>
 <input
 id={bulkBuildingId}
 type="text"
 required
 value={building}
 onChange={(e) => setBuilding(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>
 </div>

 <div>
 <label
 htmlFor={bulkFloorId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Floor Level
 </label>
 <input
 id={bulkFloorId}
 type="text"
 required
 value={floor}
 onChange={(e) => setFloor(e.target.value)}
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
 />
 </div>

 <div className="flex items-center gap-6 pt-1">
 <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={isSmokingAllowed}
 onChange={(e) => setIsSmokingAllowed(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F]"
 />
 Smoking Allowed
 </label>
 <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={isAccessible}
 onChange={(e) => setIsAccessible(e.target.checked)}
 className="w-4 h-4 rounded text-[#0B6E4F]"
 />
 Accessible Rooms
 </label>
 </div>

 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 ">
 Will generate{" "}
 <strong className="text-[#0B6E4F] tabular-nums-lkr font-bold">
 {previewCount} rooms
 </strong>{" "}
 ({prefix}
 {startNumber} to {prefix}
 {endNumber}) in {building}, Floor {floor}.
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 ">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
 >
 Generate {previewCount} Rooms
 </button>
 </div>
 </form>
 </DialogModal>
 );
}

// ============================================================================
// Main Component: RoomInventoryGrid
// ============================================================================

export function RoomInventoryGrid({
 initialRooms,
 availableRoomTypes = DEFAULT_ROOM_TYPES,
 onSaveRooms,
 isSaving = false,
 readOnly = false,
}: RoomInventoryGridProps) {
 const [rooms, setRooms] = useState<ReadonlyArray<PhysicalRoom>>(
 () => initialRooms ?? DEFAULT_PHYSICAL_ROOMS,
 );
 const [selectedWing, setSelectedWing] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
 const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
 const [editingRoom, setEditingRoom] = useState<PhysicalRoom | null>(null);
 const [saveSuccess, setSaveSuccess] = useState(false);

 // Compute unique wings for filter pills
 const wings = useMemo(() => {
 const set = new Set<string>();
 for (const r of rooms) {
 if (r.building) set.add(r.building);
 }
 return Array.from(set);
 }, [rooms]);

 // Statistics
 const totalCount = rooms.length;
 const occupiedCount = rooms.filter((r) => r.isOccupied).length;
 const vacantCleanCount = rooms.filter(
 (r) =>
 !r.isOccupied &&
 (r.housekeepingStatus === HousekeepingStatus.Clean ||
 r.housekeepingStatus === HousekeepingStatus.Inspected),
 ).length;
 const dirtyCount = rooms.filter(
 (r) =>
 r.housekeepingStatus === HousekeepingStatus.Dirty ||
 r.housekeepingStatus === HousekeepingStatus.TouchUp,
 ).length;
 const outOfOrderCount = rooms.filter(
 (r) =>
 r.housekeepingStatus === HousekeepingStatus.OutOfOrder ||
 r.housekeepingStatus === HousekeepingStatus.OutOfService,
 ).length;

 const filteredRooms = useMemo(() => {
 return rooms.filter((r) => {
 const matchesWing = selectedWing === "ALL" || r.building === selectedWing;
 const q = searchQuery.trim().toLowerCase();
 const matchesQuery =
 q.length === 0 ||
 r.roomNumber.toLowerCase().includes(q) ||
 r.roomTypeName.toLowerCase().includes(q) ||
 r.building.toLowerCase().includes(q);
 return matchesWing && matchesQuery;
 });
 }, [rooms, selectedWing, searchQuery]);

 const handleOpenAdd = () => {
 setEditingRoom(null);
 setIsSingleModalOpen(true);
 };

 const handleOpenEdit = (room: PhysicalRoom) => {
 setEditingRoom(room);
 setIsSingleModalOpen(true);
 };

 const handleSaveRoom = (saved: PhysicalRoom) => {
 setRooms((prev) => {
 const exists = prev.some((r) => r.id === saved.id);
 if (exists) {
 return prev.map((r) => (r.id === saved.id ? saved : r));
 }
 return [...prev, saved];
 });
 };

 const handleBulkCreate = (newRooms: ReadonlyArray<PhysicalRoom>) => {
 setRooms((prev) => {
 const existingMap = new Set(prev.map((r) => r.roomNumber.toLowerCase()));
 const filtered = newRooms.filter((r) => !existingMap.has(r.roomNumber.toLowerCase()));
 return [...prev, ...filtered];
 });
 };

 const handleDeleteRoom = (roomId: string) => {
 setRooms((prev) => prev.filter((r) => r.id !== roomId));
 };

 const handleSaveAll = async () => {
 setSaveSuccess(false);
 if (onSaveRooms) {
 await onSaveRooms(rooms);
 setSaveSuccess(true);
 }
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto font-sf-pro">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
 Physical Room &amp; Villa Inventory Grid
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Manage individual room numbers, floor levels, buildings/wings, smoking policies, and
 interconnecting links.
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
 Inventory Saved
 </span>
 )}

 {!readOnly && (
 <>
 <button
 type="button"
 onClick={() => setIsBulkModalOpen(true)}
 className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 + Bulk Create
 </button>
 <button
 type="button"
 onClick={handleOpenAdd}
 className="min-h-[44px] px-4 rounded-xl bg-[#0B6E4F]/10 text-[#0B6E4F] text-xs font-semibold hover:bg-[#0B6E4F]/20 transition-colors cursor-pointer"
 >
 + Add Room
 </button>
 <button
 type="button"
 onClick={handleSaveAll}
 disabled={isSaving}
 className="min-h-[44px] px-5 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
 >
 {isSaving ? "Saving..." : "Save Rooms"}
 </button>
 </>
 )}
 </div>
 </div>

 {/* KPI Stats Bar */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
 <GlassCard material="regular" radius="lg" className="p-3 text-center">
 <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
 Total Rooms
 </span>
 <span className="text-xl font-bold text-slate-900 tabular-nums-lkr">
 {totalCount}
 </span>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-3 text-center">
 <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">
 Vacant Clean
 </span>
 <span className="text-xl font-bold text-emerald-600 tabular-nums-lkr">
 {vacantCleanCount}
 </span>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-3 text-center">
 <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 block">
 Occupied
 </span>
 <span className="text-xl font-bold text-rose-600 tabular-nums-lkr">
 {occupiedCount}
 </span>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-3 text-center">
 <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">
 Dirty / Touch Up
 </span>
 <span className="text-xl font-bold text-amber-600 tabular-nums-lkr">
 {dirtyCount}
 </span>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-3 text-center">
 <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
 Out of Order
 </span>
 <span className="text-xl font-bold text-slate-600 tabular-nums-lkr">
 {outOfOrderCount}
 </span>
 </GlassCard>
 </div>

 {/* Control Bar: Search & Wing Filters */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 {/* Search */}
 <div className="relative w-full sm:w-64">
 <input
 type="text"
 placeholder="Search room #, type, wing..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[40px]"
 />
 <svg
 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
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

 {/* Wing Filter Pills */}
 <div className="flex flex-wrap items-center gap-1.5">
 <button
 type="button"
 onClick={() => setSelectedWing("ALL")}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
 selectedWing === "ALL"
 ? "bg-[#0B6E4F] text-white shadow-sm"
 : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
 }`}
 >
 All Wings ({rooms.length})
 </button>
 {wings.map((w) => {
 const count = rooms.filter((r) => r.building === w).length;
 const isSelected = selectedWing === w;
 return (
 <button
 key={w}
 type="button"
 onClick={() => setSelectedWing(w)}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
 isSelected
 ? "bg-[#0B6E4F] text-white shadow-sm"
 : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
 }`}
 >
 {w} ({count})
 </button>
 );
 })}
 </div>
 </div>

 {/* Room Grid */}
 {filteredRooms.length === 0 ? (
 <GlassCard material="regular" radius="lg" className="p-8 text-center space-y-2">
 <p className="text-sm font-semibold text-slate-700 ">
 No rooms match your filter criteria.
 </p>
 <p className="text-xs text-slate-500 ">
 Try adjusting your search query or selected building wing.
 </p>
 </GlassCard>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
 {filteredRooms.map((room) => (
 <RoomCard
 key={room.id}
 room={room}
 onEdit={handleOpenEdit}
 onDelete={handleDeleteRoom}
 readOnly={readOnly}
 />
 ))}
 </div>
 )}

 {/* Single Room Modal */}
 {isSingleModalOpen && (
 <SingleRoomModal
 isOpen={isSingleModalOpen}
 initialData={editingRoom}
 availableRoomTypes={availableRoomTypes}
 existingRooms={rooms}
 onClose={() => setIsSingleModalOpen(false)}
 onSave={handleSaveRoom}
 />
 )}

 {/* Bulk Creation Modal */}
 {isBulkModalOpen && (
 <BulkCreateModal
 isOpen={isBulkModalOpen}
 availableRoomTypes={availableRoomTypes}
 onClose={() => setIsBulkModalOpen(false)}
 onBulkCreate={handleBulkCreate}
 />
 )}
 </div>
 );
}
