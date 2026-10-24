import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { MealPlan } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ResidencyTier = "RESIDENT_LKR" | "FOREIGN_USD";

export interface DirectBookingRoomType {
 readonly id: string;
 readonly code: string;
 readonly name: string;
 readonly description: string;
 readonly baseRateResidentLkr: number;
 readonly baseRateForeignUsd: number;
 readonly maxAdults: number;
 readonly maxChildren: number;
 readonly squareMeters: number;
 readonly bedType: string;
 readonly amenities: ReadonlyArray<string>;
 readonly photoUrl: string;
 readonly availableCount: number;
}

export interface DirectBookingStaySelection {
 readonly roomTypeId: string;
 readonly mealPlan: MealPlan;
 readonly checkInDate: string;
 readonly checkOutDate: string;
 readonly nights: number;
 readonly adultsCount: number;
 readonly childrenCount: number;
 readonly roomsCount: number;
 readonly residencyTier: ResidencyTier;
}

export interface FourStageTaxBreakdown {
 readonly baseAmountLkr: number;
 readonly baseAmountUsd: number;
 readonly serviceChargeLkr: number; // Stage 1: 10%
 readonly subtotalAfterScLkr: number;
 readonly tdlLkr: number; // Stage 2: 1%
 readonly ssclLkr: number; // Stage 3: 2.5%
 readonly vatBaseLkr: number;
 readonly vatLkr: number; // Stage 4: 18%
 readonly grandTotalLkr: number;
 readonly grandTotalUsd: number;
}

export interface DirectBookingEngineProps {
 readonly tenantId?: string | undefined;
 readonly propertyTitle?: string | undefined;
 readonly propertySubtitle?: string | undefined;
 readonly heroBannerUrl?: string | undefined;
 readonly cbslUsdExchangeRate?: number | undefined;
 readonly initialRoomTypes?: ReadonlyArray<DirectBookingRoomType> | undefined;
 readonly onProceedToCheckout?:
 | ((selection: DirectBookingStaySelection, tax: FourStageTaxBreakdown) => Promise<void> | void)
 | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Default Mock Data & Meal Plan Supplements
// ============================================================================

export const DEFAULT_CBSL_USD_RATE = 300.0;

export const MEAL_PLAN_SUPPLEMENTS_LKR: Record<MealPlan, number> = {
 [MealPlan.Ro]: 0,
 [MealPlan.Bb]: 3500,
 [MealPlan.Hb]: 8000,
 [MealPlan.Fb]: 12500,
 [MealPlan.Ai]: 18000,
};

export const MEAL_PLAN_SUPPLEMENTS_USD: Record<MealPlan, number> = {
 [MealPlan.Ro]: 0,
 [MealPlan.Bb]: 12,
 [MealPlan.Hb]: 27,
 [MealPlan.Fb]: 42,
 [MealPlan.Ai]: 60,
};

export const DEFAULT_BOOKING_ROOMS: ReadonlyArray<DirectBookingRoomType> = [
 {
 id: "rt-dlx-ocean",
 code: "DLX-OCN",
 name: "Deluxe Ocean View Room",
 description:
 "Panoramic Indian Ocean views, private sun-terrace, king-size four-poster bed, and Ceylon artisan tea bar.",
 baseRateResidentLkr: 42000,
 baseRateForeignUsd: 140,
 maxAdults: 2,
 maxChildren: 1,
 squareMeters: 46,
 bedType: "1 King Bed",
 amenities: [
 "Ocean View",
 "Private Balcony",
 "Air Conditioning",
 "Ceylon Tea Bar",
 "Rain Shower",
 ],
 photoUrl:
 "/images/room-deluxe-ocean.jpg",
 availableCount: 4,
 },
 {
 id: "rt-grand-villa",
 code: "VIL-GRD",
 name: "Grand Beachfront Pool Villa",
 description:
 "Private plunge pool with direct coral reef access, outdoor rain shower, double vanity, and 24h butler service.",
 baseRateResidentLkr: 88000,
 baseRateForeignUsd: 295,
 maxAdults: 3,
 maxChildren: 2,
 squareMeters: 92,
 bedType: "2 King Beds",
 amenities: [
 "Private Pool",
 "Direct Beach Access",
 "Outdoor Shower",
 "Butler Service",
 "Espresso Bar",
 ],
 photoUrl:
 "/images/room-beachfront-pool-villa.jpg",
 availableCount: 2,
 },
 {
 id: "rt-cinnamon-ste",
 code: "STE-CIN",
 name: "Cinnamon Heritage Master Suite",
 description:
 "Restored colonial teak furnishings, freestanding copper soaking bathtub, vaulted ceilings, and fort ramparts view.",
 baseRateResidentLkr: 65000,
 baseRateForeignUsd: 220,
 maxAdults: 2,
 maxChildren: 1,
 squareMeters: 68,
 bedType: "1 Super King Bed",
 amenities: [
 "Colonial Heritage",
 "Freestanding Bathtub",
 "Ramparts View",
 "Lounge Area",
 "Pillow Menu",
 ],
 photoUrl:
 "/images/room-heritage-master-suite.jpg",
 availableCount: 1,
 },
 {
 id: "rt-garden-room",
 code: "RO-GRD",
 name: "Standard Tropical Garden Room",
 description:
 "Serene courtyard garden vistas surrounded by frangipani blossoms, queen canopy bed, and handcrafted wicker seating.",
 baseRateResidentLkr: 28000,
 baseRateForeignUsd: 95,
 maxAdults: 2,
 maxChildren: 0,
 squareMeters: 34,
 bedType: "1 Queen Bed",
 amenities: ["Garden View", "Air Conditioning", "Free WiFi", "Ceylon Tea Bar", "Safety Box"],
 photoUrl:
 "/images/boutique-courtyard-login.jpg",
 availableCount: 5,
 },
];

export const RESIDENCY_OPTIONS: ReadonlyArray<SegmentedControlOption<ResidencyTier>> = [
 { id: "RESIDENT_LKR", label: "Sri Lankan Resident (LKR)" },
 { id: "FOREIGN_USD", label: "Foreign Visitor (USD)" },
];

export const DIRECT_MEAL_PLAN_OPTIONS: ReadonlyArray<SegmentedControlOption<MealPlan>> = [
 { id: MealPlan.Ro, label: "Room Only (RO)" },
 { id: MealPlan.Bb, label: "Breakfast (BB)" },
 { id: MealPlan.Hb, label: "Half Board (HB)" },
 { id: MealPlan.Fb, label: "Full Board (FB)" },
];

// ============================================================================
// 4-Stage Compounding Tax Calculator
// ============================================================================

export function calculateFourStageTax(
 baseAmountLkr: number,
 exchangeRate: number = DEFAULT_CBSL_USD_RATE,
): FourStageTaxBreakdown {
 // Stage 1: 10% Service Charge distributed to employee pool
 const scLkr = Math.round(baseAmountLkr * 0.1);
 const subtotalAfterScLkr = baseAmountLkr + scLkr;

 // Stage 2: 1% Tourism Development Levy (TDL) to SLTDA
 const tdlLkr = Math.round(subtotalAfterScLkr * 0.01);

 // Stage 3: 2.5% Social Security Contribution Levy (SSCL) to IRD
 const ssclLkr = Math.round(subtotalAfterScLkr * 0.025);

 // Stage 4: 18% Value Added Tax (VAT) on (Subtotal A + TDL + SSCL)
 const vatBaseLkr = subtotalAfterScLkr + tdlLkr + ssclLkr;
 const vatLkr = Math.round(vatBaseLkr * 0.18);

 // Grand Total in LKR & USD equivalent
 const grandTotalLkr = subtotalAfterScLkr + tdlLkr + ssclLkr + vatLkr;
 const baseAmountUsd = Math.round((baseAmountLkr / exchangeRate) * 100) / 100;
 const grandTotalUsd = Math.round((grandTotalLkr / exchangeRate) * 100) / 100;

 return {
 baseAmountLkr,
 baseAmountUsd,
 serviceChargeLkr: scLkr,
 subtotalAfterScLkr,
 tdlLkr,
 ssclLkr,
 vatBaseLkr,
 vatLkr,
 grandTotalLkr,
 grandTotalUsd,
 };
}

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface HeroBannerProps {
 readonly title: string;
 readonly subtitle: string;
 readonly heroUrl: string;
}

function HeroBanner({ title, subtitle, heroUrl }: HeroBannerProps) {
 return (
 <div className="relative h-48 w-full overflow-hidden rounded-[24px] sm:h-64 md:h-72">
 <img src={heroUrl} alt={title} className="h-full w-full object-cover" loading="eager" />
 <div className="absolute inset-0 bg-black/45" />

 <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 sm:bottom-6 sm:left-6 sm:right-6">
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-[#0B6E4F] px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
 Best Rate Guarantee • Save 15%
 </span>
 <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-md">
 Zero Booking Fees
 </span>
 </div>
 <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
 {title}
 </h1>
 <p className="text-xs text-slate-700 sm:text-sm">{subtitle}</p>
 </div>
 </div>
 );
}

interface PaxStepperProps {
 readonly label: string;
 readonly value: number;
 readonly min: number;
 readonly max: number;
 readonly onChange: (val: number) => void;
}

function PaxStepper({ label, value, min, max, onChange }: PaxStepperProps) {
 return (
 <div className="flex items-center justify-between py-1">
 <span className="text-xs font-medium text-apple-gray-700 ">
 {label}
 </span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 disabled={value <= min}
 onClick={() => onChange(value - 1)}
 className="apple-touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-apple-gray-300 bg-white font-bold text-apple-gray-700 shadow-sm transition-apple-spring hover:bg-apple-gray-100 disabled:opacity-40 "
 aria-label={`Decrease ${label}`}
 >
 -
 </button>
 <span className="tabular-nums-lkr w-6 text-center text-sm font-semibold text-apple-gray-900 ">
 {value}
 </span>
 <button
 type="button"
 disabled={value >= max}
 onClick={() => onChange(value + 1)}
 className="apple-touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-apple-gray-300 bg-white font-bold text-apple-gray-700 shadow-sm transition-apple-spring hover:bg-apple-gray-100 disabled:opacity-40 "
 aria-label={`Increase ${label}`}
 >
 +
 </button>
 </div>
 </div>
 );
}

interface StayFilterBarProps {
 readonly checkIn: string;
 readonly checkOut: string;
 readonly adultsCount: number;
 readonly childrenCount: number;
 readonly roomsCount: number;
 readonly residency: ResidencyTier;
 readonly onCheckInChange: (val: string) => void;
 readonly onCheckOutChange: (val: string) => void;
 readonly onAdultsChange: (val: number) => void;
 readonly onChildrenChange: (val: number) => void;
 readonly onRoomsChange: (val: number) => void;
 readonly onResidencyChange: (val: ResidencyTier) => void;
}

function StayFilterBar({
 checkIn,
 checkOut,
 adultsCount,
 childrenCount,
 roomsCount,
 residency,
 onCheckInChange,
 onCheckOutChange,
 onAdultsChange,
 onChildrenChange,
 onRoomsChange,
 onResidencyChange,
}: StayFilterBarProps) {
 const checkInInputId = useId();
 const checkOutInputId = useId();

 return (
 <GlassCard material="regular" radius="lg" className="p-4 sm:p-5">
 <div className="flex flex-col gap-4">
 {/* Residency Toggle */}
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
 <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-500 ">
 Residency Rate Category
 </span>
 <SegmentedControl
 options={RESIDENCY_OPTIONS}
 value={residency}
 onChange={onResidencyChange}
 size="sm"
 />
 </div>

 {/* Date and Pax Controls */}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <div>
 <label
 htmlFor={checkInInputId}
 className="block text-xs font-semibold text-apple-gray-600 "
 >
 Check-In Date
 </label>
 <input
 id={checkInInputId}
 type="date"
 value={checkIn}
 onChange={(e) => onCheckInChange(e.target.value)}
 className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white/90 px-3 py-2 text-xs font-medium text-apple-gray-800 shadow-sm "
 />
 </div>

 <div>
 <label
 htmlFor={checkOutInputId}
 className="block text-xs font-semibold text-apple-gray-600 "
 >
 Check-Out Date
 </label>
 <input
 id={checkOutInputId}
 type="date"
 value={checkOut}
 onChange={(e) => onCheckOutChange(e.target.value)}
 className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white/90 px-3 py-2 text-xs font-medium text-apple-gray-800 shadow-sm "
 />
 </div>

 <div className="sm:col-span-2">
 <span className="block text-xs font-semibold text-apple-gray-600 ">
 Guests &amp; Rooms
 </span>
 <div className="mt-1 grid grid-cols-3 gap-2 rounded-xl border border-apple-gray-300/80 bg-white/60 p-1.5 ">
 <PaxStepper
 label="Adults"
 value={adultsCount}
 min={1}
 max={10}
 onChange={onAdultsChange}
 />
 <PaxStepper
 label="Children"
 value={childrenCount}
 min={0}
 max={6}
 onChange={onChildrenChange}
 />
 <PaxStepper
 label="Rooms"
 value={roomsCount}
 min={1}
 max={5}
 onChange={onRoomsChange}
 />
 </div>
 </div>
 </div>
 </div>
 </GlassCard>
 );
}

interface RoomCardProps {
 readonly room: DirectBookingRoomType;
 readonly isSelected: boolean;
 readonly selectedMealPlan: MealPlan;
 readonly residency: ResidencyTier;
 readonly nights: number;
 readonly onSelectRoom: (roomId: string) => void;
 readonly onSelectMealPlan: (plan: MealPlan) => void;
}

function RoomCard({
 room,
 isSelected,
 selectedMealPlan,
 residency,
 nights,
 onSelectRoom,
 onSelectMealPlan,
}: RoomCardProps) {
 const baseRate =
 residency === "RESIDENT_LKR" ? room.baseRateResidentLkr : room.baseRateForeignUsd;
 const supplement =
 residency === "RESIDENT_LKR"
 ? MEAL_PLAN_SUPPLEMENTS_LKR[selectedMealPlan]
 : MEAL_PLAN_SUPPLEMENTS_USD[selectedMealPlan];
 const nightlyRate = baseRate + supplement;
 const totalStayRate = nightlyRate * nights;

 const priceFormatted =
 residency === "RESIDENT_LKR" ? formatLkr(nightlyRate) : `$${nightlyRate.toLocaleString()}`;
 const totalFormatted =
 residency === "RESIDENT_LKR" ? formatLkr(totalStayRate) : `$${totalStayRate.toLocaleString()}`;

 return (
 <GlassCard
 material="regular"
 radius="lg"
 className={`overflow-hidden transition-all ${
 isSelected
 ? "ring-2 ring-apple-blue shadow-lg bg-blue-50/20 "
 : "hover:shadow-md"
 }`}
 >
 <div className="flex flex-col md:flex-row">
 {/* 1:1 Aspect ratio photo with squircle radius */}
 <div className="relative h-56 w-full shrink-0 md:w-64 overflow-hidden">
 <img
 src={room.photoUrl}
 alt={room.name}
 className="h-full w-full object-cover"
 loading="lazy"
 decoding="async"
 />
 <span className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
 {room.availableCount} rooms left
 </span>
 </div>

 {/* Content & Tariffs */}
 <div className="flex flex-1 flex-col justify-between p-5">
 <div>
 <div className="flex flex-wrap items-baseline justify-between gap-2">
 <h3 className="text-lg font-bold text-apple-gray-900 ">
 {room.name}
 </h3>
 <div className="text-right">
 <span className="tabular-nums-lkr text-lg font-bold text-[#0B6E4F]">
 {priceFormatted}
 </span>
 <span className="text-xs text-apple-gray-500"> / night</span>
 </div>
 </div>

 <p className="mt-1 text-xs text-apple-gray-600 ">
 {room.description}
 </p>

 <div className="mt-3 flex flex-wrap gap-1.5">
 <span className="rounded-md bg-apple-gray-100 px-2 py-0.5 text-[11px] text-apple-gray-600 ">
 {room.bedType}
 </span>
 <span className="rounded-md bg-apple-gray-100 px-2 py-0.5 text-[11px] text-apple-gray-600 ">
 {room.squareMeters} m²
 </span>
 <span className="rounded-md bg-apple-gray-100 px-2 py-0.5 text-[11px] text-apple-gray-600 ">
 Max {room.maxAdults} Adults, {room.maxChildren} Child
 </span>
 {room.amenities.slice(0, 3).map((amenity) => (
 <span
 key={amenity}
 className="rounded-md bg-[#0B6E4F]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B6E4F] "
 >
 {amenity}
 </span>
 ))}
 </div>
 </div>

 <div className="mt-4 border-t border-apple-gray-200/60 pt-3 ">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 {/* Meal Plan Selector */}
 <div>
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500 ">
 Select Meal Plan
 </span>
 <div className="mt-1">
 <SegmentedControl
 options={DIRECT_MEAL_PLAN_OPTIONS}
 value={selectedMealPlan}
 onChange={onSelectMealPlan}
 size="sm"
 />
 </div>
 </div>

 {/* Action Button */}
 <div className="flex items-center gap-3 self-end sm:self-auto">
 <div className="text-right">
 <span className="text-[11px] text-apple-gray-400">
 {nights} night{nights > 1 ? "s" : ""} stay:
 </span>
 <p className="tabular-nums-lkr text-xs font-bold text-apple-gray-900 ">
 {totalFormatted}
 </p>
 </div>
 <button
 type="button"
 onClick={() => onSelectRoom(room.id)}
 className={`apple-touch-target rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition-apple-spring active:scale-[0.98] ${
 isSelected
 ? "bg-[#0B6E4F] text-white hover:bg-[#0B6E4F]/90"
 : "bg-[#0B6E4F] text-white hover:bg-[#0B6E4F]/90"
 }`}
 >
 {isSelected ? "Selected" : "Select Room"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </GlassCard>
 );
}

interface TaxBreakdownModalProps {
 readonly isOpen: boolean;
 readonly tax: FourStageTaxBreakdown;
 readonly onClose: () => void;
}

function TaxBreakdownModal({ isOpen, tax, onClose }: TaxBreakdownModalProps) {
 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title="Transparent Sri Lankan Statutory Tax Breakdown"
 description="Compounding 4-stage taxes enforced under IRD & SLTDA tourism hospitality regulations."
 size="md"
 >
 <div className="space-y-3 pt-2 text-xs">
 <div className="flex justify-between border-b border-apple-gray-200/60 pb-2 ">
 <span className="text-apple-gray-600 ">
 Stage 0: Base Accommodation Supply:
 </span>
 <span className="tabular-nums-lkr font-semibold text-apple-gray-900 ">
 {formatLkr(tax.baseAmountLkr)}
 </span>
 </div>

 <div className="flex justify-between">
 <span className="text-apple-gray-600 ">
 Stage 1: 10% Service Charge (Staff Pool Distribution):
 </span>
 <span className="tabular-nums-lkr font-medium text-apple-gray-900 ">
 +{formatLkr(tax.serviceChargeLkr)}
 </span>
 </div>

 <div className="flex justify-between">
 <span className="text-apple-gray-600 ">
 Stage 2: 1% Tourism Development Levy (SLTDA TDL):
 </span>
 <span className="tabular-nums-lkr font-medium text-apple-gray-900 ">
 +{formatLkr(tax.tdlLkr)}
 </span>
 </div>

 <div className="flex justify-between">
 <span className="text-apple-gray-600 ">
 Stage 3: 2.5% Social Security Contribution Levy (IRD SSCL):
 </span>
 <span className="tabular-nums-lkr font-medium text-apple-gray-900 ">
 +{formatLkr(tax.ssclLkr)}
 </span>
 </div>

 <div className="flex justify-between border-b border-apple-gray-200/60 pb-2 ">
 <span className="text-apple-gray-600 ">
 Stage 4: 18% Value Added Tax (IRD VAT):
 </span>
 <span className="tabular-nums-lkr font-medium text-apple-gray-900 ">
 +{formatLkr(tax.vatLkr)}
 </span>
 </div>

 <div className="flex justify-between pt-1 text-sm font-bold">
 <span className="text-apple-gray-900 ">Grand Total Payable:</span>
 <span className="tabular-nums-lkr text-[#0B6E4F]">{formatLkr(tax.grandTotalLkr)}</span>
 </div>
 </div>
 </DialogModal>
 );
}

interface FloatingBarProps {
 readonly selectedRoom: DirectBookingRoomType | undefined;
 readonly nights: number;
 readonly mealPlan: MealPlan;
 readonly tax: FourStageTaxBreakdown;
 readonly residency: ResidencyTier;
 readonly onOpenTaxBreakdown: () => void;
 readonly onProceed: () => void;
}

function FloatingBar({
 selectedRoom,
 nights,
 mealPlan,
 tax,
 residency,
 onOpenTaxBreakdown,
 onProceed,
}: FloatingBarProps) {
 if (!selectedRoom) {
 return null;
 }

 const grandDisplay =
 residency === "RESIDENT_LKR"
 ? formatLkr(tax.grandTotalLkr)
 : `$${tax.grandTotalUsd.toLocaleString()}`;

 return (
 <div className="sticky bottom-4 z-40 mx-auto max-w-4xl px-4">
 <div className="apple-liquid-glass squircle-xl flex items-center justify-between p-4 shadow-2xl backdrop-blur-2xl">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-bold text-apple-gray-900 ">
 {selectedRoom.name}
 </span>
 <span className="rounded bg-apple-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-apple-gray-700 ">
 {mealPlan}
 </span>
 </div>
 <div className="flex items-center gap-2 text-xs text-apple-gray-500">
 <span>
 {nights} night{nights > 1 ? "s" : ""}
 </span>
 <span>•</span>
 <button
 type="button"
 onClick={onOpenTaxBreakdown}
 className="text-[#0B6E4F] underline hover:text-[#0B6E4F]/80"
 >
 Includes 4-Stage Taxes &amp; SC ⓘ
 </button>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <div className="text-right">
 <span className="text-[11px] uppercase tracking-wider text-apple-gray-500">Total</span>
 <p className="tabular-nums-lkr text-lg font-bold text-apple-gray-900 ">
 {grandDisplay}
 </p>
 </div>

 <button
 type="button"
 onClick={onProceed}
 className="apple-touch-target inline-flex items-center gap-2 rounded-xl bg-[#0B6E4F] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-apple-spring hover:bg-[#0B6E4F]/90 active:scale-[0.98]"
 >
 <span>Proceed to Add-Ons</span>
 <span>→</span>
 </button>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Master Screen Component
// ============================================================================

export function DirectBookingEngine({
 tenantId = "tenant-galle-fort",
 propertyTitle = "Galle Fort Lighthouse Villa",
 propertySubtitle = "UNESCO World Heritage Luxury Boutique Hotel • Ramparts & Ocean View",
 heroBannerUrl = "/images/galle-fort-villa-hero.jpg",
 cbslUsdExchangeRate = DEFAULT_CBSL_USD_RATE,
 initialRoomTypes = DEFAULT_BOOKING_ROOMS,
 onProceedToCheckout,
 className = "",
}: DirectBookingEngineProps) {
 const [residency, setResidency] = useState<ResidencyTier>("RESIDENT_LKR");
 const [checkIn, setCheckIn] = useState("2026-11-15");
 const [checkOut, setCheckOut] = useState("2026-11-18");
 const [adults, setAdults] = useState(2);
 const [children, setChildren] = useState(0);
 const [rooms, setRooms] = useState(1);
 const [selectedRoomId, setSelectedRoomId] = useState<string>(() => initialRoomTypes[0]?.id || "");
 const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan>(MealPlan.Bb);
 const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

 // Calculate nights count safely
 const inDate = new Date(checkIn);
 const outDate = new Date(checkOut);
 const nights = Math.max(
 1,
 Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)) || 1,
 );

 const selectedRoom = initialRoomTypes.find((r) => r.id === selectedRoomId);

 // Compute 4-stage tax compounding
 const baseRate = selectedRoom
 ? residency === "RESIDENT_LKR"
 ? selectedRoom.baseRateResidentLkr
 : selectedRoom.baseRateForeignUsd * cbslUsdExchangeRate
 : 0;

 const mealSupplement =
 residency === "RESIDENT_LKR"
 ? MEAL_PLAN_SUPPLEMENTS_LKR[selectedMealPlan]
 : MEAL_PLAN_SUPPLEMENTS_USD[selectedMealPlan] * cbslUsdExchangeRate;

 const totalBaseLkr = (baseRate + mealSupplement) * nights * rooms;
 const taxBreakdown = calculateFourStageTax(totalBaseLkr, cbslUsdExchangeRate);

 const handleProceed = () => {
 if (!selectedRoom) {
 return;
 }
 const selection: DirectBookingStaySelection = {
 roomTypeId: selectedRoom.id,
 mealPlan: selectedMealPlan,
 checkInDate: checkIn,
 checkOutDate: checkOut,
 nights,
 adultsCount: adults,
 childrenCount: children,
 roomsCount: rooms,
 residencyTier: residency,
 };
 onProceedToCheckout?.(selection, taxBreakdown);
 };

 return (
 <div className={`mx-auto max-w-5xl space-y-6 pb-24 ${className}`} data-tenant={tenantId}>
 {/* 1. 3:1 Hero Banner */}
 <HeroBanner title={propertyTitle} subtitle={propertySubtitle} heroUrl={heroBannerUrl} />

 {/* 2. Stay Filter Bar */}
 <StayFilterBar
 checkIn={checkIn}
 checkOut={checkOut}
 adultsCount={adults}
 childrenCount={children}
 roomsCount={rooms}
 residency={residency}
 onCheckInChange={setCheckIn}
 onCheckOutChange={setCheckOut}
 onAdultsChange={setAdults}
 onChildrenChange={setChildren}
 onRoomsChange={setRooms}
 onResidencyChange={setResidency}
 />

 {/* 3. Available Room Cards Grid */}
 <section className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-base font-bold text-apple-gray-900 ">
 Available Rooms &amp; Villas ({initialRoomTypes.length})
 </h2>
 <span className="text-xs text-apple-gray-500">
 Free Cancellation up to 48 hours before check-in
 </span>
 </div>

 {initialRoomTypes.map((room) => (
 <RoomCard
 key={room.id}
 room={room}
 isSelected={room.id === selectedRoomId}
 selectedMealPlan={selectedMealPlan}
 residency={residency}
 nights={nights}
 onSelectRoom={setSelectedRoomId}
 onSelectMealPlan={setSelectedMealPlan}
 />
 ))}
 </section>

 {/* 4. Floating Reservation Bottom Bar */}
 <FloatingBar
 selectedRoom={selectedRoom}
 nights={nights}
 mealPlan={selectedMealPlan}
 tax={taxBreakdown}
 residency={residency}
 onOpenTaxBreakdown={() => setIsTaxModalOpen(true)}
 onProceed={handleProceed}
 />

 {/* 5. 4-Stage Tax Breakdown Modal */}
 <TaxBreakdownModal
 isOpen={isTaxModalOpen}
 tax={taxBreakdown}
 onClose={() => setIsTaxModalOpen(false)}
 />
 </div>
 );
}
