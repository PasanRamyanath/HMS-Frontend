import { type FormEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { MealPlan } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";
import { DEFAULT_RATE_MATRICES, type RoomCategoryRateMatrix } from "../rooms/RateMatrixGrid.js";
import {
 DEFAULT_EXCHANGE_RATE_USD_LKR,
 type StaySimulationResult,
 calculateStaySimulation,
 formatUsd,
} from "../rooms/RateSimulatorDialog.js";
import { DEFAULT_ROOM_TYPES, type RoomTypeModel } from "../rooms/RoomTypeManager.js";
import type { SeasonalBand } from "../rooms/SeasonalBandsEditor.js";
import {
 DEFAULT_TAPE_CHART_ROOMS,
 type TapeChartRoom,
 addDays,
 getDaysDifference,
 toIsoDateString,
} from "./TapeChartGrid.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type BookingMode = "ADVANCE_BOOKING" | "WALK_IN" | "DMC_VOUCHER";
export type ResidencyType = "SRI_LANKAN_RESIDENT" | "FOREIGN_TOURIST";
export type DetectedIdentityType = "NIC_OLD" | "NIC_NEW" | "PASSPORT" | "UNKNOWN";

export interface ReservationFormData {
 readonly bookingMode: BookingMode;
 readonly confirmationCode: string;
 readonly checkInDate: string; // YYYY-MM-DD
 readonly checkOutDate: string; // YYYY-MM-DD
 readonly roomTypeId: string;
 readonly roomId: string;
 readonly guestName: string;
 readonly guestPhone: string;
 readonly guestEmail: string;
 readonly identityType: DetectedIdentityType;
 readonly identityNumber: string;
 readonly nationality: string;
 readonly residency: ResidencyType;
 readonly mealPlan: MealPlan;
 readonly adultsCount: number;
 readonly childrenCount: number;
 readonly extraBedsCount: number;
 readonly babyCotsCount: number;
 readonly driverQuartersRequired: boolean;
 readonly driverMealsRequired: boolean;
 readonly dmcName?: string | undefined;
 readonly dmcVoucherCode?: string | undefined;
 readonly totalNights: number;
 readonly netSupplyLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly totalTaxesLkr: number;
 readonly grandTotalLkr: number;
 readonly grandTotalUsd: number;
 readonly notes?: string | undefined;
}

export interface ReservationModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onSave?: ((reservation: ReservationFormData) => Promise<void> | void) | undefined;
 readonly isSaving?: boolean | undefined;
 readonly initialRoomId?: string | undefined;
 readonly initialDate?: string | undefined;
 readonly initialBookingMode?: BookingMode | undefined;
 readonly availableRooms?: ReadonlyArray<TapeChartRoom> | undefined;
 readonly roomTypes?: ReadonlyArray<RoomTypeModel> | undefined;
 readonly rateMatrices?: ReadonlyArray<RoomCategoryRateMatrix> | undefined;
 readonly seasonalBands?: ReadonlyArray<SeasonalBand> | undefined;
 readonly exchangeRateUsdLkr?: number | undefined;
}

// ============================================================================
// Identity Detection & Defaults
// ============================================================================

export function detectIdentityType(value: string): DetectedIdentityType {
 const trimmed = value.trim();
 if (/^[0-9]{9}[vVxX]$/.test(trimmed)) return "NIC_OLD";
 if (/^[0-9]{12}$/.test(trimmed)) return "NIC_NEW";
 if (/^[A-Za-z]{1,2}[0-9A-Za-z]{6,9}$/.test(trimmed)) return "PASSPORT";
 return "UNKNOWN";
}

export function generateConfirmationCode(mode: BookingMode = "ADVANCE_BOOKING"): string {
 const prefix = mode === "WALK_IN" ? "WLK" : mode === "DMC_VOUCHER" ? "DMC" : "RES";
 const now = new Date();
 const yearMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
 const randomSuffix = Math.floor(1000 + Math.random() * 9000);
 return `${prefix}-${yearMonth}-${randomSuffix}`;
}

const POPULAR_DMC_PARTNERS: ReadonlyArray<string> = [
 "Aitken Spence Travels",
 "Jetwing Travels",
 "Walkers Tours (John Keells)",
 "Ceylon Roots",
 "Diethelm Travel Sri Lanka",
 "Abercrombie & Kent Ceylon",
 "Red Dot Tours",
 "Other Direct Agency",
];

const MEAL_PLAN_LABELS: Record<MealPlan, { short: string; full: string; desc: string }> = {
 [MealPlan.Ro]: { short: "RO", full: "Room Only", desc: "European Plan" },
 [MealPlan.Bb]: { short: "BB", full: "Bed & Breakfast", desc: "Continental / Ceylon Breakfast" },
 [MealPlan.Hb]: { short: "HB", full: "Half Board", desc: "Breakfast & Dinner" },
 [MealPlan.Fb]: { short: "FB", full: "Full Board", desc: "All 3 Meals Included" },
 [MealPlan.Ai]: { short: "AI", full: "All Inclusive", desc: "Meals, Beverages & Excursions" },
};

const ALL_MEAL_PLANS = [MealPlan.Ro, MealPlan.Bb, MealPlan.Hb, MealPlan.Fb, MealPlan.Ai] as const;

// ============================================================================
// Focused Presentational Sub-Components (Cognitive Complexity <= 4 each)
// ============================================================================

interface ModalHeaderProps {
 readonly bookingMode: BookingMode;
 readonly confirmationCode: string;
 readonly bookingModeOptions: ReadonlyArray<SegmentedControlOption<BookingMode>>;
 readonly onBookingModeChange: (mode: BookingMode) => void;
}

function ModalHeader({
 bookingMode,
 confirmationCode,
 bookingModeOptions,
 onBookingModeChange,
}: ModalHeaderProps) {
 const title =
 bookingMode === "WALK_IN"
 ? "Instant Walk-In Check-In"
 : bookingMode === "DMC_VOUCHER"
 ? "DMC Tour Operator Booking"
 : "New Advance Reservation";

 return (
 <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sf-pro">
 {title}
 </h2>
 <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-200/70 text-slate-700 ">
 {confirmationCode}
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-0.5">
 Sri Lankan statutory 4-stage tax compounding & live inventory allocation
 </p>
 </div>

 <SegmentedControl<BookingMode>
 value={bookingMode}
 onChange={onBookingModeChange}
 options={bookingModeOptions}
 size="sm"
 />
 </div>
 );
}

interface StayDatesSectionProps {
 readonly checkInDate: string;
 readonly checkOutDate: string;
 readonly totalNights: number;
 readonly minCheckIn?: string | undefined;
 readonly onCheckInChange: (date: string) => void;
 readonly onCheckOutChange: (date: string) => void;
}

function StayDatesSection({
 checkInDate,
 checkOutDate,
 totalNights,
 minCheckIn,
 onCheckInChange,
 onCheckOutChange,
}: StayDatesSectionProps) {
 return (
 <GlassCard className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 1. Stay Dates & Length
 </h3>
 <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 tabular-nums-lkr">
 {totalNights} {totalNights === 1 ? "Night" : "Nights"} Stay
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor="res-checkin"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Check-In Date (from 14:00)
 </label>
 <input
 id="res-checkin"
 type="date"
 value={checkInDate}
 min={minCheckIn}
 onChange={(e) => onCheckInChange(e.target.value)}
 required
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-checkout"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Check-Out Date (until 11:00)
 </label>
 <input
 id="res-checkout"
 type="date"
 value={checkOutDate}
 min={addDays(checkInDate, 1)}
 onChange={(e) => onCheckOutChange(e.target.value)}
 required
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr min-h-[44px]"
 />
 </div>
 </div>
 </GlassCard>
 );
}

interface RoomAllocationSectionProps {
 readonly selectedRoomTypeId: string;
 readonly selectedRoomId: string;
 readonly roomTypes: ReadonlyArray<RoomTypeModel>;
 readonly eligibleRooms: ReadonlyArray<TapeChartRoom>;
 readonly isRoomRequired: boolean;
 readonly onRoomTypeChange: (typeId: string) => void;
 readonly onRoomChange: (roomId: string) => void;
}

function RoomAllocationSection({
 selectedRoomTypeId,
 selectedRoomId,
 roomTypes,
 eligibleRooms,
 isRoomRequired,
 onRoomTypeChange,
 onRoomChange,
}: RoomAllocationSectionProps) {
 return (
 <GlassCard className="p-4 space-y-3">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 2. Room Allocation
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor="res-roomtype"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Room Type
 </label>
 <select
 id="res-roomtype"
 value={selectedRoomTypeId}
 onChange={(e) => onRoomTypeChange(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 >
 {roomTypes.map((rt) => (
 <option key={rt.id} value={rt.id}>
 {rt.name} ({formatLkr(rt.baseRateResidentLkr)} / ${rt.baseRateForeignUsd})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor="res-room"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Assigned Room {isRoomRequired ? "(Required)" : "(Optional)"}
 </label>
 <select
 id="res-room"
 value={selectedRoomId}
 onChange={(e) => onRoomChange(e.target.value)}
 required={isRoomRequired}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 >
 <option value="">-- Auto-Allocate Upon Check-In --</option>
 {eligibleRooms.map((room) => (
 <option key={room.id} value={room.id}>
 Room {room.roomNumber} ({room.building} - Floor {room.floor})
 </option>
 ))}
 </select>
 </div>
 </div>
 </GlassCard>
 );
}

interface TariffAndMealPlanSectionProps {
 readonly residency: ResidencyType;
 readonly mealPlan: MealPlan;
 readonly residencyOptions: ReadonlyArray<SegmentedControlOption<ResidencyType>>;
 readonly onResidencyChange: (residency: ResidencyType) => void;
 readonly onMealPlanChange: (plan: MealPlan) => void;
}

function TariffAndMealPlanSection({
 residency,
 mealPlan,
 residencyOptions,
 onResidencyChange,
 onMealPlanChange,
}: TariffAndMealPlanSectionProps) {
 return (
 <GlassCard className="p-4 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 3. Tariff & Meal Plan
 </h3>
 <span className="text-xs text-slate-500 ">
 {residency === "SRI_LANKAN_RESIDENT" ? "Resident LKR Tariff" : "Foreign USD Tariff"}
 </span>
 </div>

 <SegmentedControl<ResidencyType>
 value={residency}
 onChange={onResidencyChange}
 options={residencyOptions}
 fullWidth
 size="sm"
 />

 <div>
 <span className="block text-xs font-medium text-slate-600 mb-1.5">
 Meal Plan Arrangement
 </span>
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
 {ALL_MEAL_PLANS.map((plan) => {
 const meta = MEAL_PLAN_LABELS[plan];
 const isSelected = mealPlan === plan;
 return (
 <button
 key={plan}
 type="button"
 onClick={() => onMealPlanChange(plan)}
 className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
 isSelected
 ? "border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
 : "border-slate-200/80 bg-white/40 hover:bg-slate-50 text-slate-700 "
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-sm tracking-tight">{meta.short}</span>
 {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
 </div>
 <span className="text-[10px] leading-tight text-slate-500 mt-1 line-clamp-1">
 {meta.full}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 </GlassCard>
 );
}

interface OccupancyAndDriverSectionProps {
 readonly adultsCount: number;
 readonly childrenCount: number;
 readonly extraBedsCount: number;
 readonly babyCotsCount: number;
 readonly driverQuartersRequired: boolean;
 readonly driverMealsRequired: boolean;
 readonly onAdultsChange: (count: number) => void;
 readonly onChildrenChange: (count: number) => void;
 readonly onExtraBedsChange: (count: number) => void;
 readonly onBabyCotsChange: (count: number) => void;
 readonly onDriverQuartersChange: (required: boolean) => void;
 readonly onDriverMealsChange: (required: boolean) => void;
}

function OccupancyAndDriverSection({
 adultsCount,
 childrenCount,
 extraBedsCount,
 babyCotsCount,
 driverQuartersRequired,
 driverMealsRequired,
 onAdultsChange,
 onChildrenChange,
 onExtraBedsChange,
 onBabyCotsChange,
 onDriverQuartersChange,
 onDriverMealsChange,
}: OccupancyAndDriverSectionProps) {
 return (
 <GlassCard className="p-4 space-y-3">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 4. Occupancy & Chauffeur Services
 </h3>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div>
 <label
 htmlFor="res-adults"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Adults
 </label>
 <input
 id="res-adults"
 type="number"
 min={1}
 max={6}
 value={adultsCount}
 onChange={(e) => onAdultsChange(Math.max(1, Number.parseInt(e.target.value) || 1))}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-children"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Children
 </label>
 <input
 id="res-children"
 type="number"
 min={0}
 max={4}
 value={childrenCount}
 onChange={(e) => onChildrenChange(Math.max(0, Number.parseInt(e.target.value) || 0))}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-extrabeds"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Extra Beds (+Rs 6k)
 </label>
 <input
 id="res-extrabeds"
 type="number"
 min={0}
 max={2}
 value={extraBedsCount}
 onChange={(e) => onExtraBedsChange(Math.max(0, Number.parseInt(e.target.value) || 0))}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-babycots"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Baby Cots (+Rs 1.5k)
 </label>
 <input
 id="res-babycots"
 type="number"
 min={0}
 max={2}
 value={babyCotsCount}
 onChange={(e) => onBabyCotsChange(Math.max(0, Number.parseInt(e.target.value) || 0))}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
 />
 </div>
 </div>

 <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row gap-4">
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer min-h-[36px]">
 <input
 type="checkbox"
 checked={driverQuartersRequired}
 onChange={(e) => onDriverQuartersChange(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 "
 />
 <span>Chauffeur Dormitory Bed (+Rs 2,500/night)</span>
 </label>

 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer min-h-[36px]">
 <input
 type="checkbox"
 checked={driverMealsRequired}
 onChange={(e) => onDriverMealsChange(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 "
 />
 <span>Chauffeur Meals (+Rs 1,500/night)</span>
 </label>
 </div>
 </GlassCard>
 );
}

interface GuestProfileSectionProps {
 readonly guestName: string;
 readonly guestPhone: string;
 readonly guestEmail: string;
 readonly identityNumber: string;
 readonly nationality: string;
 readonly detectedIdentity: DetectedIdentityType;
 readonly onGuestNameChange: (val: string) => void;
 readonly onGuestPhoneChange: (val: string) => void;
 readonly onGuestEmailChange: (val: string) => void;
 readonly onIdentityChange: (val: string) => void;
 readonly onNationalityChange: (val: string) => void;
}

function GuestProfileSection({
 guestName,
 guestPhone,
 guestEmail,
 identityNumber,
 nationality,
 detectedIdentity,
 onGuestNameChange,
 onGuestPhoneChange,
 onGuestEmailChange,
 onIdentityChange,
 onNationalityChange,
}: GuestProfileSectionProps) {
 const badgeLabel =
 detectedIdentity === "NIC_OLD"
 ? "NIC (Old 10-char)"
 : detectedIdentity === "NIC_NEW"
 ? "NIC (New 12-digit)"
 : "Passport Detected";

 return (
 <GlassCard className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 5. Primary Guest Profile
 </h3>
 {detectedIdentity !== "UNKNOWN" && (
 <StatusBadge
 status={detectedIdentity}
 color={detectedIdentity === "PASSPORT" ? "indigo" : "green"}
 label={badgeLabel}
 size="sm"
 />
 )}
 </div>

 <div>
 <label
 htmlFor="res-guestname"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Full Name (as in NIC / Passport)
 </label>
 <input
 id="res-guestname"
 type="text"
 required
 value={guestName}
 onChange={(e) => onGuestNameChange(e.target.value)}
 placeholder="e.g. Kasun Chamara / Oliver Smith"
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor="res-phone"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Phone Number
 </label>
 <input
 id="res-phone"
 type="tel"
 required
 value={guestPhone}
 onChange={(e) => onGuestPhoneChange(e.target.value)}
 placeholder="+94 77 123 4567"
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-identity"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 NIC or Passport No.
 </label>
 <input
 id="res-identity"
 type="text"
 required
 value={identityNumber}
 onChange={(e) => onIdentityChange(e.target.value)}
 placeholder="e.g. 853401234V / N1234567"
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs min-h-[44px]"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor="res-email"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Email Address
 </label>
 <input
 id="res-email"
 type="email"
 value={guestEmail}
 onChange={(e) => onGuestEmailChange(e.target.value)}
 placeholder="guest@example.com"
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 />
 </div>

 <div>
 <label
 htmlFor="res-nationality"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Nationality
 </label>
 <input
 id="res-nationality"
 type="text"
 value={nationality}
 onChange={(e) => onNationalityChange(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 />
 </div>
 </div>
 </GlassCard>
 );
}

interface DmcVoucherSectionProps {
 readonly dmcName: string;
 readonly dmcVoucherCode: string;
 readonly onDmcNameChange: (val: string) => void;
 readonly onDmcVoucherCodeChange: (val: string) => void;
}

function DmcVoucherSection({
 dmcName,
 dmcVoucherCode,
 onDmcNameChange,
 onDmcVoucherCodeChange,
}: DmcVoucherSectionProps) {
 return (
 <GlassCard className="p-4 space-y-3 border-amber-300/50 bg-amber-50/40 ">
 <h3 className="text-sm font-semibold tracking-wide text-amber-900 uppercase font-sf-pro">
 6. DMC / Tour Operator Voucher
 </h3>

 <div className="space-y-3">
 <div>
 <label
 htmlFor="res-dmcname"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Tour Operator Partner
 </label>
 <select
 id="res-dmcname"
 value={dmcName}
 onChange={(e) => onDmcNameChange(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 >
 {POPULAR_DMC_PARTNERS.map((p) => (
 <option key={p} value={p}>
 {p}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor="res-voucher"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Voucher / Booking Reference Number
 </label>
 <input
 id="res-voucher"
 type="text"
 required
 value={dmcVoucherCode}
 onChange={(e) => onDmcVoucherCodeChange(e.target.value)}
 placeholder="e.g. AST-2026-98432"
 className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs min-h-[44px]"
 />
 </div>
 </div>
 </GlassCard>
 );
}

interface LiveQuoteSectionProps {
 readonly liveQuote: StaySimulationResult | null;
 readonly totalNights: number;
 readonly mealPlan: MealPlan;
 readonly residency: ResidencyType;
 readonly exchangeRateUsdLkr: number;
}

function LiveQuoteSection({
 liveQuote,
 totalNights,
 mealPlan,
 residency,
 exchangeRateUsdLkr,
}: LiveQuoteSectionProps) {
 if (!liveQuote) {
 return (
 <GlassCard className="bg-white p-4 space-y-3 ">
 <p className="text-xs text-slate-500">Select dates and room type to calculate quote.</p>
 </GlassCard>
 );
 }

 const extrasSum = liveQuote.totalExtraBedsLkr + liveQuote.totalBabyCotsLkr;

 return (
 <GlassCard className="bg-white p-4 space-y-3 ">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold tracking-wide text-slate-900 uppercase font-sf-pro">
 Live Stay Quote
 </h3>
 <span className="text-[11px] text-slate-500 ">
 4-Stage Statutory Compounding
 </span>
 </div>

 <div className="space-y-2 text-xs">
 <div className="flex justify-between py-1 border-b border-slate-200/50 text-slate-600 ">
 <span>Room Base ({totalNights} nights)</span>
 <span className="tabular-nums-lkr font-medium">
 {formatLkr(liveQuote.totalBaseRoomLkr)}
 </span>
 </div>

 {liveQuote.totalAdultMealsLkr > 0 && (
 <div className="flex justify-between py-1 border-b border-slate-200/50 text-slate-600 ">
 <span>Meal Supplements ({MEAL_PLAN_LABELS[mealPlan].short})</span>
 <span className="tabular-nums-lkr font-medium">
 {formatLkr(liveQuote.totalAdultMealsLkr)}
 </span>
 </div>
 )}

 {extrasSum > 0 && (
 <div className="flex justify-between py-1 border-b border-slate-200/50 text-slate-600 ">
 <span>Beds & Cots</span>
 <span className="tabular-nums-lkr font-medium">{formatLkr(extrasSum)}</span>
 </div>
 )}

 {liveQuote.totalDriverQuartersLkr > 0 && (
 <div className="flex justify-between py-1 border-b border-slate-200/50 text-slate-600 ">
 <span>Chauffeur Accommodation</span>
 <span className="tabular-nums-lkr font-medium">
 {formatLkr(liveQuote.totalDriverQuartersLkr)}
 </span>
 </div>
 )}

 <div className="flex justify-between py-1 text-slate-700 font-semibold">
 <span>Net Taxable Supply</span>
 <span className="tabular-nums-lkr">{formatLkr(liveQuote.totalNetSupplyLkr)}</span>
 </div>

 <div className="p-2.5 rounded-lg bg-slate-100/60 space-y-1 text-[11px] text-slate-500 ">
 <div className="flex justify-between">
 <span>Service Charge (10% SC)</span>
 <span className="tabular-nums-lkr font-mono">
 {formatLkr(liveQuote.totalServiceChargeLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Tourism Dev. Levy (1% TDL)</span>
 <span className="tabular-nums-lkr font-mono">{formatLkr(liveQuote.totalTdlLkr)}</span>
 </div>
 <div className="flex justify-between">
 <span>Social Security (2.5% SSCL)</span>
 <span className="tabular-nums-lkr font-mono">{formatLkr(liveQuote.totalSsclLkr)}</span>
 </div>
 <div className="flex justify-between">
 <span>Value Added Tax (18% VAT)</span>
 <span className="tabular-nums-lkr font-mono">{formatLkr(liveQuote.totalVatLkr)}</span>
 </div>
 </div>

 <div className="pt-2 flex items-baseline justify-between border-t-2 border-slate-300 ">
 <div>
 <span className="text-sm font-bold text-slate-900 font-sf-pro">
 Grand Total
 </span>
 {residency === "FOREIGN_TOURIST" && (
 <span className="block text-[11px] text-slate-500 tabular-nums-lkr">
 {formatUsd(liveQuote.grandTotalUsd)} (@ {exchangeRateUsdLkr} LKR)
 </span>
 )}
 </div>
 <PriceTag amountLkr={liveQuote.grandTotalLkr} size="lg" className="text-right" />
 </div>
 </div>
 </GlassCard>
 );
}

interface ModalFooterProps {
 readonly bookingMode: BookingMode;
 readonly isSaving: boolean;
 readonly isSubmitDisabled: boolean;
 readonly onClose: () => void;
}

function ModalFooter({ bookingMode, isSaving, isSubmitDisabled, onClose }: ModalFooterProps) {
 const submitText = isSaving
 ? "Processing..."
 : bookingMode === "WALK_IN"
 ? "Complete Walk-In Check-In"
 : bookingMode === "DMC_VOUCHER"
 ? "Confirm DMC Voucher Booking"
 : "Create Advance Reservation";

 const btnColor =
 bookingMode === "WALK_IN"
 ? "bg-emerald-600 hover:bg-emerald-700 active:scale-98"
 : bookingMode === "DMC_VOUCHER"
 ? "bg-amber-600 hover:bg-amber-700 active:scale-98"
 : "bg-blue-600 hover:bg-blue-700 active:scale-98";

 return (
 <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/70 flex items-center justify-between">
 <button
 type="button"
 onClick={onClose}
 disabled={isSaving}
 className="apple-touch-target px-4 py-2 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-200/60 transition-colors"
 >
 Cancel
 </button>

 <button
 type="submit"
 disabled={isSubmitDisabled}
 className={`apple-touch-target px-5 py-2 text-sm font-semibold rounded-xl text-slate-900 shadow-md transition-all ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {submitText}
 </button>
 </div>
 );
}

// ============================================================================
// Main Container Component
// ============================================================================

export function ReservationModal({
 isOpen,
 onClose,
 onSave,
 isSaving = false,
 initialRoomId,
 initialDate,
 initialBookingMode = "ADVANCE_BOOKING",
 availableRooms = DEFAULT_TAPE_CHART_ROOMS,
 roomTypes = DEFAULT_ROOM_TYPES,
 rateMatrices = DEFAULT_RATE_MATRICES,
 seasonalBands,
 exchangeRateUsdLkr = DEFAULT_EXCHANGE_RATE_USD_LKR,
}: ReservationModalProps) {
 const formId = useId();

 // Booking mode state
 const [bookingMode, setBookingMode] = useState<BookingMode>(initialBookingMode);

 // Dates state
 const todayIso = useMemo(() => toIsoDateString(new Date()), []);
 const defaultCheckIn = initialDate ?? todayIso;
 const [checkInDate, setCheckInDate] = useState<string>(defaultCheckIn);
 const [checkOutDate, setCheckOutDate] = useState<string>(() => addDays(defaultCheckIn, 2));

 // Room Type & Room Allocation
 const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(() => {
 if (initialRoomId) {
 const match = availableRooms.find((r) => r.id === initialRoomId);
 if (match) {
 const typeMatch = roomTypes.find((t) => t.name === match.roomTypeName);
 if (typeMatch) return typeMatch.id;
 }
 }
 return roomTypes[0]?.id ?? "rt-dlx-ocean";
 });

 const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId ?? "");

 // Residency & Identification
 const [residency, setResidency] = useState<ResidencyType>("SRI_LANKAN_RESIDENT");
 const [guestName, setGuestName] = useState<string>("");
 const [guestPhone, setGuestPhone] = useState<string>("");
 const [guestEmail, setGuestEmail] = useState<string>("");
 const [identityNumber, setIdentityNumber] = useState<string>("");
 const [nationality, setNationality] = useState<string>("Sri Lankan");

 // Meal Plan & Occupancy
 const [mealPlan, setMealPlan] = useState<MealPlan>(MealPlan.Bb);
 const [adultsCount, setAdultsCount] = useState<number>(2);
 const [childrenCount, setChildrenCount] = useState<number>(0);
 const [extraBedsCount, setExtraBedsCount] = useState<number>(0);
 const [babyCotsCount, setBabyCotsCount] = useState<number>(0);

 // Chauffeur / Driver Accommodation
 const [driverQuartersRequired, setDriverQuartersRequired] = useState<boolean>(false);
 const [driverMealsRequired, setDriverMealsRequired] = useState<boolean>(false);

 // DMC Fields
 const [dmcName, setDmcName] = useState<string>(
 POPULAR_DMC_PARTNERS[0] ?? "Aitken Spence Travels",
 );
 const [dmcVoucherCode, setDmcVoucherCode] = useState<string>("");
 const [notes, setNotes] = useState<string>("");

 // Confirmation Code
 const [confirmationCode] = useState<string>(() => generateConfirmationCode(initialBookingMode));

 // Identity auto-detection
 const detectedIdentity = useMemo(() => detectIdentityType(identityNumber), [identityNumber]);

 const handleIdentityChange = (value: string) => {
 setIdentityNumber(value);
 const detected = detectIdentityType(value);
 if (detected === "NIC_OLD" || detected === "NIC_NEW") {
 setResidency("SRI_LANKAN_RESIDENT");
 setNationality("Sri Lankan");
 } else if (detected === "PASSPORT") {
 setResidency("FOREIGN_TOURIST");
 if (nationality === "Sri Lankan") {
 setNationality("Foreign Tourist");
 }
 }
 };

 const handleCheckInDateChange = (newIn: string) => {
 setCheckInDate(newIn);
 if (newIn >= checkOutDate) {
 setCheckOutDate(addDays(newIn, 1));
 }
 };

 const handleBookingModeChange = (mode: BookingMode) => {
 setBookingMode(mode);
 if (mode === "WALK_IN") {
 setCheckInDate(todayIso);
 if (checkOutDate <= todayIso) {
 setCheckOutDate(addDays(todayIso, 1));
 }
 }
 };

 // Active room type & eligible room selection
 const activeRoomType = useMemo(
 () =>
 roomTypes.find((t) => t.id === selectedRoomTypeId) ?? roomTypes[0] ?? DEFAULT_ROOM_TYPES[0],
 [roomTypes, selectedRoomTypeId],
 );

 const eligibleRooms = useMemo(() => {
 if (!activeRoomType) return availableRooms;
 return availableRooms.filter(
 (r) =>
 r.roomTypeName.toLowerCase().includes(activeRoomType.name.toLowerCase()) ||
 activeRoomType.name.toLowerCase().includes(r.roomTypeName.toLowerCase()),
 );
 }, [availableRooms, activeRoomType]);

 const totalNights = useMemo(() => {
 const diff = getDaysDifference(checkInDate, checkOutDate);
 return diff > 0 ? diff : 1;
 }, [checkInDate, checkOutDate]);

 const activeRateMatrix = useMemo(
 () => rateMatrices.find((m) => m.roomTypeId === activeRoomType?.id) ?? rateMatrices[0],
 [rateMatrices, activeRoomType],
 );

 const liveQuote = useMemo(() => {
 if (!activeRoomType) return null;
 return calculateStaySimulation({
 checkInDate,
 checkOutDate,
 roomType: activeRoomType,
 rateMatrix: activeRateMatrix,
 residency: residency === "FOREIGN_TOURIST" ? "FOREIGN" : "RESIDENT",
 adultCount: adultsCount,
 children: Array.from({ length: childrenCount }, () => ({ ageYears: 6 })),
 mealPlan,
 extraBedsCount,
 babyCotsCount,
 driverQuartersRequired,
 driverMealsRequired,
 pricingModel: "TAX_EXCLUSIVE",
 seasonalBands,
 exchangeRateUsdLkr,
 });
 }, [
 checkInDate,
 checkOutDate,
 activeRoomType,
 activeRateMatrix,
 residency,
 adultsCount,
 childrenCount,
 mealPlan,
 extraBedsCount,
 babyCotsCount,
 driverQuartersRequired,
 driverMealsRequired,
 seasonalBands,
 exchangeRateUsdLkr,
 ]);

 const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 if (!onSave || !liveQuote) return;

 const formData: ReservationFormData = {
 bookingMode,
 confirmationCode,
 checkInDate,
 checkOutDate,
 roomTypeId: selectedRoomTypeId,
 roomId: selectedRoomId || (eligibleRooms[0]?.id ?? ""),
 guestName,
 guestPhone,
 guestEmail,
 identityType: detectedIdentity,
 identityNumber,
 nationality,
 residency,
 mealPlan,
 adultsCount,
 childrenCount,
 extraBedsCount,
 babyCotsCount,
 driverQuartersRequired,
 driverMealsRequired,
 dmcName: bookingMode === "DMC_VOUCHER" ? dmcName : undefined,
 dmcVoucherCode: bookingMode === "DMC_VOUCHER" ? dmcVoucherCode : undefined,
 totalNights,
 netSupplyLkr: liveQuote.totalNetSupplyLkr,
 serviceChargeLkr: liveQuote.totalServiceChargeLkr,
 tdlLkr: liveQuote.totalTdlLkr,
 ssclLkr: liveQuote.totalSsclLkr,
 vatLkr: liveQuote.totalVatLkr,
 totalTaxesLkr: liveQuote.totalTaxesLkr,
 grandTotalLkr: liveQuote.grandTotalLkr,
 grandTotalUsd: liveQuote.grandTotalUsd,
 notes: notes || undefined,
 };

 onSave(formData);
 };

 const bookingModeOptions: ReadonlyArray<SegmentedControlOption<BookingMode>> = useMemo(
 () => [
 { id: "ADVANCE_BOOKING", label: "Advance Booking" },
 { id: "WALK_IN", label: "Walk-In Check-In" },
 { id: "DMC_VOUCHER", label: "DMC Voucher" },
 ],
 [],
 );

 const residencyOptions: ReadonlyArray<SegmentedControlOption<ResidencyType>> = useMemo(
 () => [
 { id: "SRI_LANKAN_RESIDENT", label: "Sri Lankan Resident" },
 { id: "FOREIGN_TOURIST", label: "Foreign Tourist" },
 ],
 [],
 );

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 size="xl"
 variant="centerModal"
 ariaLabel="New Reservation & Check-In Dialog"
 showCloseButton={!isSaving}
 closeOnEsc={!isSaving}
 closeOnScrimClick={!isSaving}
 className="p-0 overflow-hidden"
 >
 <form id={formId} onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
 <ModalHeader
 bookingMode={bookingMode}
 confirmationCode={confirmationCode}
 bookingModeOptions={bookingModeOptions}
 onBookingModeChange={handleBookingModeChange}
 />

 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 <div className="lg:col-span-7 space-y-5">
 <StayDatesSection
 checkInDate={checkInDate}
 checkOutDate={checkOutDate}
 totalNights={totalNights}
 minCheckIn={bookingMode === "WALK_IN" ? todayIso : undefined}
 onCheckInChange={handleCheckInDateChange}
 onCheckOutChange={setCheckOutDate}
 />

 <RoomAllocationSection
 selectedRoomTypeId={selectedRoomTypeId}
 selectedRoomId={selectedRoomId}
 roomTypes={roomTypes}
 eligibleRooms={eligibleRooms}
 isRoomRequired={bookingMode === "WALK_IN"}
 onRoomTypeChange={(id) => {
 setSelectedRoomTypeId(id);
 setSelectedRoomId("");
 }}
 onRoomChange={setSelectedRoomId}
 />

 <TariffAndMealPlanSection
 residency={residency}
 mealPlan={mealPlan}
 residencyOptions={residencyOptions}
 onResidencyChange={(r) => {
 setResidency(r);
 if (r === "SRI_LANKAN_RESIDENT") {
 setNationality("Sri Lankan");
 }
 }}
 onMealPlanChange={setMealPlan}
 />

 <OccupancyAndDriverSection
 adultsCount={adultsCount}
 childrenCount={childrenCount}
 extraBedsCount={extraBedsCount}
 babyCotsCount={babyCotsCount}
 driverQuartersRequired={driverQuartersRequired}
 driverMealsRequired={driverMealsRequired}
 onAdultsChange={setAdultsCount}
 onChildrenChange={setChildrenCount}
 onExtraBedsChange={setExtraBedsCount}
 onBabyCotsChange={setBabyCotsCount}
 onDriverQuartersChange={setDriverQuartersRequired}
 onDriverMealsChange={setDriverMealsRequired}
 />
 </div>

 <div className="lg:col-span-5 space-y-5">
 <GuestProfileSection
 guestName={guestName}
 guestPhone={guestPhone}
 guestEmail={guestEmail}
 identityNumber={identityNumber}
 nationality={nationality}
 detectedIdentity={detectedIdentity}
 onGuestNameChange={setGuestName}
 onGuestPhoneChange={setGuestPhone}
 onGuestEmailChange={setGuestEmail}
 onIdentityChange={handleIdentityChange}
 onNationalityChange={setNationality}
 />

 {bookingMode === "DMC_VOUCHER" && (
 <DmcVoucherSection
 dmcName={dmcName}
 dmcVoucherCode={dmcVoucherCode}
 onDmcNameChange={setDmcName}
 onDmcVoucherCodeChange={setDmcVoucherCode}
 />
 )}

 <LiveQuoteSection
 liveQuote={liveQuote}
 totalNights={totalNights}
 mealPlan={mealPlan}
 residency={residency}
 exchangeRateUsdLkr={exchangeRateUsdLkr}
 />

 <div>
 <label
 htmlFor="res-notes"
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Special Requests / Front-Desk Notes
 </label>
 <textarea
 id="res-notes"
 rows={2}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="e.g. Honeymoon setup, king bed requested, late check-in at 22:00..."
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>
 </div>

 <ModalFooter
 bookingMode={bookingMode}
 isSaving={isSaving}
 isSubmitDisabled={isSaving || !liveQuote}
 onClose={onClose}
 />
 </form>
 </DialogModal>
 );
}
