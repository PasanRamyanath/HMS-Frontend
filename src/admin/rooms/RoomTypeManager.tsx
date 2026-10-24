import { type FormEvent, useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { WebpUploadField } from "../../components/WebpUploadField.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface RoomTypeModel {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly baseRateResidentLkr: number;
  readonly baseRateForeignUsd: number;
  readonly maxOccupancyAdults: number;
  readonly maxOccupancyChildren: number;
  readonly extraBedMax: number;
  readonly totalRoomCount: number;
  readonly amenities: ReadonlyArray<string>;
  readonly photos: ReadonlyArray<string>;
  readonly channexRoomTypeId?: string | undefined;
  readonly isActive: boolean;
}

export interface RoomTypeManagerProps {
  readonly initialRoomTypes?: ReadonlyArray<RoomTypeModel> | undefined;
  readonly onSave?: ((roomTypes: ReadonlyArray<RoomTypeModel>) => Promise<void> | void) | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

export const SRI_LANKAN_HOTEL_AMENITIES: ReadonlyArray<string> = [
  "Ocean View",
  "Private Balcony",
  "Air Conditioning",
  "Free WiFi",
  "Ceylon Tea Bar",
  "Mini Bar",
  "Garden View",
  "Plunge Pool",
  "Two Bedrooms",
  "Rainfall Shower",
  "Outdoor Shower",
  "Kitchenette",
  "Work Desk",
  "Bathtub",
  "Safety Box",
];

export const DEFAULT_ROOM_TYPES: ReadonlyArray<RoomTypeModel> = [
  {
    id: "rt-dlx-ocean",
    code: "DLX-OCN",
    name: "Deluxe Ocean View",
    description:
      "Panoramic Indian Ocean view with private balcony, king-size canopy bed, and espresso machine.",
    baseRateResidentLkr: 42000,
    baseRateForeignUsd: 140,
    maxOccupancyAdults: 2,
    maxOccupancyChildren: 1,
    extraBedMax: 1,
    totalRoomCount: 8,
    amenities: [
      "Ocean View",
      "Private Balcony",
      "Air Conditioning",
      "Free WiFi",
      "Ceylon Tea Bar",
      "Mini Bar",
    ],
    photos: ["/images/rooms/deluxe-ocean.webp"],
    channexRoomTypeId: "chnx_rt_001_dlx_ocn",
    isActive: true,
  },
  {
    id: "rt-fam-chalet",
    code: "FAM-CHL",
    name: "Family Chalet",
    description:
      "Spacious two-bedroom bungalow nestled in tropical gardens with interconnecting rooms and outdoor shower.",
    baseRateResidentLkr: 65000,
    baseRateForeignUsd: 215,
    maxOccupancyAdults: 4,
    maxOccupancyChildren: 2,
    extraBedMax: 2,
    totalRoomCount: 4,
    amenities: ["Garden View", "Two Bedrooms", "Kitchenette", "Air Conditioning", "Free WiFi"],
    photos: ["/images/rooms/family-chalet.webp"],
    channexRoomTypeId: "chnx_rt_002_fam_chl",
    isActive: true,
  },
  {
    id: "rt-std-double",
    code: "STD-DBL",
    name: "Standard Double",
    description:
      "Comfortable air-conditioned queen room overlooking courtyard with modern rain shower.",
    baseRateResidentLkr: 28000,
    baseRateForeignUsd: 95,
    maxOccupancyAdults: 2,
    maxOccupancyChildren: 0,
    extraBedMax: 0,
    totalRoomCount: 12,
    amenities: ["Courtyard View", "Air Conditioning", "Free WiFi", "Rainfall Shower", "Work Desk"],
    photos: ["/images/rooms/standard-double.webp"],
    channexRoomTypeId: "chnx_rt_003_std_dbl",
    isActive: true,
  },
];

// ============================================================================
// Validation Logic
// ============================================================================

export function validateRoomType(roomType: RoomTypeModel): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!roomType.code.trim() || roomType.code.trim().length < 2) {
    errors.code = "Room code must be at least 2 characters (e.g. DLX-OCN).";
  }

  if (!roomType.name.trim() || roomType.name.trim().length < 2) {
    errors.name = "Room category name must be at least 2 characters.";
  }

  if (!Number.isFinite(roomType.baseRateResidentLkr) || roomType.baseRateResidentLkr <= 0) {
    errors.baseRateResidentLkr = "Resident LKR rate must be greater than 0.";
  }

  if (!Number.isFinite(roomType.baseRateForeignUsd) || roomType.baseRateForeignUsd <= 0) {
    errors.baseRateForeignUsd = "Foreign USD rate must be greater than 0.";
  }

  if (!Number.isFinite(roomType.maxOccupancyAdults) || roomType.maxOccupancyAdults < 1) {
    errors.maxOccupancyAdults = "Adult occupancy must be at least 1.";
  }

  if (!Number.isFinite(roomType.totalRoomCount) || roomType.totalRoomCount < 1) {
    errors.totalRoomCount = "Total inventory must be at least 1 room.";
  }

  return errors;
}

// ============================================================================
// Subcomponents (Modularity & Low Cognitive Complexity)
// ============================================================================

interface RoomTypeCardProps {
  readonly roomType: RoomTypeModel;
  readonly onEdit: (roomType: RoomTypeModel) => void;
  readonly onToggleActive: (id: string) => void;
  readonly disabled: boolean;
}

function RoomTypeCard({ roomType, onEdit, onToggleActive, disabled }: RoomTypeCardProps) {
  const firstPhoto = roomType.photos[0];

  return (
    <GlassCard
      material="regular"
      radius="lg"
      className="p-5 flex flex-col justify-between space-y-4"
    >
      <div className="space-y-3">
        {/* Thumbnail and Title Header */}
        <div className="flex items-start gap-3.5">
          {firstPhoto ? (
            <img
              src={firstPhoto}
              alt={roomType.name}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200/80 "
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-xl">
              <svg
                className="w-4 h-4 inline-block shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 4v16" />
                <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                <path d="M2 17h20" />
                <path d="M6 8v9" />
              </svg>
              <span className="sr-only">Room</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 ">
                {roomType.code}
              </span>
              <StatusBadge status={roomType.isActive ? "CONFIRMED" : "CANCELLED"} size="sm" />
            </div>

            <h3 className="text-base font-bold text-slate-900 truncate mt-1">{roomType.name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{roomType.description}</p>
          </div>
        </div>

        {/* Dual-Tier Pricing */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 ">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Resident Rate
            </span>
            <PriceTag amountLkr={roomType.baseRateResidentLkr} size="sm" showSecondary={false} />
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Foreign USD
            </span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums-lkr">
              ${roomType.baseRateForeignUsd} USD
            </span>
          </div>
        </div>

        {/* Capacity & Amenities Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs text-slate-600 ">
            <span>
              Pax {roomType.maxOccupancyAdults} Adults, {roomType.maxOccupancyChildren} Children
            </span>
            <span>•</span>
            <span>Door {roomType.totalRoomCount} Units</span>
            {roomType.extraBedMax > 0 && (
              <>
                <span>•</span>
                <span>+{roomType.extraBedMax} Extra Bed</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {roomType.amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 "
              >
                {amenity}
              </span>
            ))}
            {roomType.amenities.length > 4 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-400">
                +{roomType.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 ">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleActive(roomType.id)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-apple-spring cursor-pointer"
        >
          {roomType.isActive ? "Deactivate" : "Activate"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit(roomType)}
          className="min-h-[36px] px-3.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-black/5 transition-apple-spring cursor-pointer"
        >
          Edit Category
        </button>
      </div>
    </GlassCard>
  );
}

interface RoomTypeEditorModalProps {
  readonly isOpen: boolean;
  readonly roomType: RoomTypeModel | null;
  readonly onClose: () => void;
  readonly onSave: (updated: RoomTypeModel) => void;
}

function RoomTypeEditorModal({ isOpen, roomType, onClose, onSave }: RoomTypeEditorModalProps) {
  const formId = useId();

  const [formData, setFormData] = useState<RoomTypeModel>(
    () =>
      roomType ?? {
        id: `rt-${Date.now()}`,
        code: "NEW-CAT",
        name: "",
        description: "",
        baseRateResidentLkr: 35000,
        baseRateForeignUsd: 120,
        maxOccupancyAdults: 2,
        maxOccupancyChildren: 0,
        extraBedMax: 1,
        totalRoomCount: 5,
        amenities: ["Air Conditioning", "Free WiFi"],
        photos: [],
        channexRoomTypeId: "",
        isActive: true,
      },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleToggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      const nextAmenities = exists
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity];
      return { ...prev, amenities: nextAmenities };
    });
  };

  const handleModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateRoomType(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSave(formData);
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={roomType ? `Edit Room Category (${roomType.code})` : "Create New Room Category"}
      size="lg"
    >
      <form onSubmit={handleModalSubmit} className="space-y-5 font-sf-pro">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={`${formId}-code`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Category Code *
            </label>
            <input
              id={`${formId}-code`}
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="DLX-OCN"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
            {errors.code && <p className="text-xs text-rose-500 mt-1">{errors.code}</p>}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-name`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Category Name *
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Deluxe Ocean View"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${formId}-desc`}
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Description
          </label>
          <textarea
            id={`${formId}-desc`}
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Room details, view, and unique guest selling points..."
            className="w-full p-3 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        {/* Dual-Tier Rates & Inventory */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={`${formId}-rateLkr`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Resident Rate (LKR) *
            </label>
            <input
              id={`${formId}-rateLkr`}
              type="number"
              min="1"
              value={formData.baseRateResidentLkr}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  baseRateResidentLkr: Number.parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
            {errors.baseRateResidentLkr && (
              <p className="text-xs text-rose-500 mt-1">{errors.baseRateResidentLkr}</p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${formId}-rateUsd`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Foreign Rate (USD) *
            </label>
            <input
              id={`${formId}-rateUsd`}
              type="number"
              min="1"
              value={formData.baseRateForeignUsd}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  baseRateForeignUsd: Number.parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
            {errors.baseRateForeignUsd && (
              <p className="text-xs text-rose-500 mt-1">{errors.baseRateForeignUsd}</p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${formId}-totalUnits`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Total Units (Inventory) *
            </label>
            <input
              id={`${formId}-totalUnits`}
              type="number"
              min="1"
              value={formData.totalRoomCount}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  totalRoomCount: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
            {errors.totalRoomCount && (
              <p className="text-xs text-rose-500 mt-1">{errors.totalRoomCount}</p>
            )}
          </div>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={`${formId}-adults`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Max Adults *
            </label>
            <input
              id={`${formId}-adults`}
              type="number"
              min="1"
              max="10"
              value={formData.maxOccupancyAdults}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  maxOccupancyAdults: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-bold text-center"
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-children`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Max Children
            </label>
            <input
              id={`${formId}-children`}
              type="number"
              min="0"
              max="8"
              value={formData.maxOccupancyChildren}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  maxOccupancyChildren: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-bold text-center"
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-extraBed`}
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Extra Beds Max
            </label>
            <input
              id={`${formId}-extraBed`}
              type="number"
              min="0"
              max="4"
              value={formData.extraBedMax}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  extraBedMax: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-bold text-center"
            />
          </div>
        </div>

        {/* 1:1 WebP Photo Uploader */}
        <div>
          <span className="block text-xs font-medium text-slate-700 mb-1">
            Room Showcase Photo (1:1 WebP Squircle)
          </span>
          <WebpUploadField
            preset="SQUARE_500"
            currentImageUrl={formData.photos[0]}
            onUploadSuccess={(res) =>
              setFormData((p) => ({ ...p, photos: res.url ? [res.url] : [] }))
            }
          />
        </div>

        {/* Amenities Selection */}
        <div>
          <span className="block text-xs font-medium text-slate-700 mb-2">
            Included Room Amenities
          </span>
          <div className="flex flex-wrap gap-2">
            {SRI_LANKAN_HOTEL_AMENITIES.map((amenity) => {
              const selected = formData.amenities.includes(amenity);
              return (
                <button
                  type="button"
                  key={amenity}
                  onClick={() => handleToggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-apple-spring cursor-pointer ${
                    selected
                      ? "bg-[#0B6E4F] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* Channex OTA Mapping ID */}
        <div>
          <label
            htmlFor={`${formId}-chnx`}
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Channex OTA Mapping ID (Booking.com / Agoda / Airbnb Sync)
          </label>
          <input
            id={`${formId}-chnx`}
            type="text"
            value={formData.channexRoomTypeId ?? ""}
            onChange={(e) => setFormData((p) => ({ ...p, channexRoomTypeId: e.target.value }))}
            placeholder="chnx_rt_001_dlx_ocn"
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-black/5 transition-apple-spring cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-sm font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Save Category
          </button>
        </div>
      </form>
    </DialogModal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RoomTypeManager({
  initialRoomTypes,
  onSave,
  isSaving = false,
  readOnly = false,
}: RoomTypeManagerProps) {
  const [roomTypes, setRoomTypes] = useState<ReadonlyArray<RoomTypeModel>>(
    () => initialRoomTypes ?? DEFAULT_ROOM_TYPES,
  );

  const [editingRoomType, setEditingRoomType] = useState<RoomTypeModel | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCreateNew = () => {
    setEditingRoomType(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (roomType: RoomTypeModel) => {
    setEditingRoomType(roomType);
    setIsEditorOpen(true);
  };

  const handleToggleActive = (id: string) => {
    setRoomTypes((prev) =>
      prev.map((rt) => (rt.id === id ? { ...rt, isActive: !rt.isActive } : rt)),
    );
  };

  const handleSaveModal = (updated: RoomTypeModel) => {
    setRoomTypes((prev) => {
      const exists = prev.some((rt) => rt.id === updated.id);
      if (exists) {
        return prev.map((rt) => (rt.id === updated.id ? updated : rt));
      }
      return [...prev, updated];
    });
    setIsEditorOpen(false);
    setEditingRoomType(null);
  };

  const handlePersistChanges = async () => {
    setSaveSuccess(false);
    if (onSave) {
      await onSave(roomTypes);
      setSaveSuccess(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
            Room Category Master Editor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dual-tier resident &amp; foreign base rates, occupancy, amenities, and Channex
            OTA mappings.
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
              Room Types Saved
            </span>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleCreateNew}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-black/5 transition-apple-spring flex items-center gap-1.5 cursor-pointer"
              >
                + Add Room Type
              </button>

              <button
                type="button"
                onClick={handlePersistChanges}
                disabled={isSaving}
                className="min-h-[44px] px-5 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? "Saving..." : "Save All Room Types"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Room Types Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roomTypes.map((roomType) => (
          <RoomTypeCard
            key={roomType.id}
            roomType={roomType}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            disabled={readOnly}
          />
        ))}
      </div>

      {/* Edit / Create Modal */}
      {isEditorOpen && (
        <RoomTypeEditorModal
          isOpen={isEditorOpen}
          roomType={editingRoomType}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingRoomType(null);
          }}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
