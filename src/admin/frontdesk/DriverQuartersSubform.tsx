import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type DriverQuartersMode = "ON_SITE_BED" | "OUTSIDE_ALLOWANCE";

export interface DriverBedOption {
 readonly id: string;
 readonly bedNumber: string;
 readonly dormBlock: string;
 readonly isAvailable: boolean;
 readonly hasLocker: boolean;
}

export interface DriverQuartersData {
 readonly driverAccompanying: boolean;
 readonly mode: DriverQuartersMode;
 readonly assignedBedId?: string | undefined;
 readonly assignedBedNumber?: string | undefined;
 readonly driverName: string;
 readonly driverPhone: string;
 readonly normalizedPhone?: string | undefined;
 readonly vehicleNumber: string;
 readonly tourAgency?: string | undefined;
 readonly includeMeals: boolean;
 readonly nightsCount: number;
 readonly nightlyBedRateLkr: number;
 readonly nightlyMealAllowanceLkr: number;
 readonly nightlyOutsideAllowanceLkr: number;
 readonly voucherCode?: string | undefined;
 readonly totalBedCostLkr: number;
 readonly totalMealCostLkr: number;
 readonly totalOutsideAllowanceLkr: number;
 readonly grandTotalLkr: number;
 readonly isValid: boolean;
 readonly errorMessage?: string | undefined;
}

export interface DriverQuartersSubformProps {
 readonly value?: Partial<DriverQuartersData> | undefined;
 readonly onChange?: ((data: DriverQuartersData) => void) | undefined;
 readonly availableBeds?: ReadonlyArray<DriverBedOption> | undefined;
 readonly nightsCount?: number | undefined;
 readonly defaultBedRateLkr?: number | undefined;
 readonly defaultMealRateLkr?: number | undefined;
 readonly defaultOutsideAllowanceLkr?: number | undefined;
 readonly disabled?: boolean | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_BED_RATE_LKR = 2500;
export const DEFAULT_MEAL_RATE_LKR = 1500;
export const DEFAULT_OUTSIDE_ALLOWANCE_LKR = 3500;

export const DEFAULT_AVAILABLE_BEDS: ReadonlyArray<DriverBedOption> = [
 {
 id: "bed-d01",
 bedNumber: "Bed D-01",
 dormBlock: "Chauffeur Annex Block A",
 isAvailable: true,
 hasLocker: true,
 },
 {
 id: "bed-d02",
 bedNumber: "Bed D-02",
 dormBlock: "Chauffeur Annex Block A",
 isAvailable: true,
 hasLocker: true,
 },
 {
 id: "bed-d03",
 bedNumber: "Bed D-03",
 dormBlock: "Chauffeur Annex Block A",
 isAvailable: false,
 hasLocker: true,
 },
 {
 id: "bed-d04",
 bedNumber: "Bed D-04",
 dormBlock: "Chauffeur Annex Block B",
 isAvailable: true,
 hasLocker: false,
 },
 {
 id: "bed-d05",
 bedNumber: "Bed D-05",
 dormBlock: "Chauffeur Annex Block B",
 isAvailable: false,
 hasLocker: false,
 },
];

// Sri Lankan Mobile telco prefixes: 70, 71, 72, 74, 75, 76, 77, 78
const SRI_LANKAN_MOBILE_REGEX = /^(?:\+94|0)?(7[01245678]\d{7})$/;

// ============================================================================
// Pure Helpers
// ============================================================================

export function validateSriLankanDriverPhone(rawPhone: string): {
 readonly isValid: boolean;
 readonly normalized?: string | undefined;
 readonly error?: string | undefined;
} {
 const cleaned = rawPhone.replace(/[\s\-().]/g, "");
 if (!cleaned) {
 return {
 isValid: false,
 error: "Driver contact number is required",
 };
 }

 const match = SRI_LANKAN_MOBILE_REGEX.exec(cleaned);
 if (!match?.[1]) {
 return {
 isValid: false,
 error: "Must be a valid 9-digit Sri Lankan mobile number (e.g. 0771234567 or +94771234567)",
 };
 }

 const normalized = `+94${match[1]}`;
 return {
 isValid: true,
 normalized,
 };
}

export function calculateDriverQuartersCost(
 mode: DriverQuartersMode,
 nightsCount: number,
 bedRateLkr: number,
 mealRateLkr: number,
 outsideRateLkr: number,
 includeMeals: boolean,
): {
 readonly totalBedCostLkr: number;
 readonly totalMealCostLkr: number;
 readonly totalOutsideAllowanceLkr: number;
 readonly grandTotalLkr: number;
} {
 const nights = Math.max(1, nightsCount);
 const totalMealCostLkr = includeMeals ? mealRateLkr * nights : 0;

 if (mode === "ON_SITE_BED") {
 const totalBedCostLkr = bedRateLkr * nights;
 return {
 totalBedCostLkr,
 totalMealCostLkr,
 totalOutsideAllowanceLkr: 0,
 grandTotalLkr: totalBedCostLkr + totalMealCostLkr,
 };
 }

 const totalOutsideAllowanceLkr = outsideRateLkr * nights;
 return {
 totalBedCostLkr: 0,
 totalMealCostLkr,
 totalOutsideAllowanceLkr,
 grandTotalLkr: totalOutsideAllowanceLkr + totalMealCostLkr,
 };
}

export function generateDriverVoucherCode(driverPhone?: string): string {
 const cleanPhone = (driverPhone ?? "").replace(/\D/g, "");
 const suffix = cleanPhone.slice(-4) || "8821";
 return `VCH-DRV-${suffix}`;
}

function buildDriverQuartersPacket(params: {
 readonly accompanying: boolean;
 readonly mode: DriverQuartersMode;
 readonly bedId?: string | undefined;
 readonly bedNumber?: string | undefined;
 readonly name: string;
 readonly phone: string;
 readonly vehicle: string;
 readonly agency: string;
 readonly includeMeals: boolean;
 readonly nights: number;
 readonly bedRate: number;
 readonly mealRate: number;
 readonly outsideRate: number;
}): DriverQuartersData {
 if (!params.accompanying) {
 return {
 driverAccompanying: false,
 mode: params.mode,
 driverName: "",
 driverPhone: "",
 vehicleNumber: "",
 includeMeals: false,
 nightsCount: params.nights,
 nightlyBedRateLkr: params.bedRate,
 nightlyMealAllowanceLkr: params.mealRate,
 nightlyOutsideAllowanceLkr: params.outsideRate,
 totalBedCostLkr: 0,
 totalMealCostLkr: 0,
 totalOutsideAllowanceLkr: 0,
 grandTotalLkr: 0,
 isValid: true,
 };
 }

 const phoneValidation = validateSriLankanDriverPhone(params.phone);
 const cost = calculateDriverQuartersCost(
 params.mode,
 params.nights,
 params.bedRate,
 params.mealRate,
 params.outsideRate,
 params.includeMeals,
 );

 const missingBed = params.mode === "ON_SITE_BED" && !params.bedId;
 const missingName = params.name.trim().length === 0;

 let errorMessage: string | undefined;
 if (missingName) {
 errorMessage = "Driver name is required";
 } else if (!phoneValidation.isValid) {
 errorMessage = phoneValidation.error;
 } else if (missingBed) {
 errorMessage = "Please assign a dormitory bed";
 }

 const isValid = !missingName && phoneValidation.isValid && !missingBed;

 return {
 driverAccompanying: true,
 mode: params.mode,
 assignedBedId: params.bedId,
 assignedBedNumber: params.bedNumber,
 driverName: params.name.trim(),
 driverPhone: params.phone.trim(),
 normalizedPhone: phoneValidation.normalized,
 vehicleNumber: params.vehicle.trim().toUpperCase(),
 tourAgency: params.agency.trim() || undefined,
 includeMeals: params.includeMeals,
 nightsCount: params.nights,
 nightlyBedRateLkr: params.bedRate,
 nightlyMealAllowanceLkr: params.mealRate,
 nightlyOutsideAllowanceLkr: params.outsideRate,
 voucherCode: generateDriverVoucherCode(params.phone),
 totalBedCostLkr: cost.totalBedCostLkr,
 totalMealCostLkr: cost.totalMealCostLkr,
 totalOutsideAllowanceLkr: cost.totalOutsideAllowanceLkr,
 grandTotalLkr: cost.grandTotalLkr,
 isValid,
 errorMessage,
 };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface DriverHeaderProps {
 readonly accompanying: boolean;
 readonly disabled: boolean;
 readonly onToggle: (checked: boolean) => void;
}

function DriverHeader({ accompanying, disabled, onToggle }: DriverHeaderProps) {
 return (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
 <input
 type="checkbox"
 checked={accompanying}
 disabled={disabled}
 onChange={(e) => onToggle(e.target.checked)}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
 </label>
 <div>
 <span className="text-sm font-semibold text-slate-900 block">
 Accompanying Chauffeur / Guide
 </span>
 <span className="text-xs text-slate-500 ">
 Dormitory lodging, external allowance voucher & meal allocation
 </span>
 </div>
 </div>

 <StatusBadge
 status={accompanying ? "ASSIGNED" : "UNASSIGNED"}
 label={accompanying ? "Active" : "None"}
 color={accompanying ? "blue" : "gray"}
 size="sm"
 />
 </div>
 );
}

interface DormBedSelectorProps {
 readonly beds: ReadonlyArray<DriverBedOption>;
 readonly selectedBedId?: string | undefined;
 readonly nightlyRateLkr: number;
 readonly disabled: boolean;
 readonly onSelectBed: (bed: DriverBedOption) => void;
}

interface DormBedCardProps {
 readonly bed: DriverBedOption;
 readonly isSelected: boolean;
 readonly disabled: boolean;
 readonly onSelect: (bed: DriverBedOption) => void;
}

function getBedCardStyle(isSelected: boolean, isAvailable: boolean): string {
 if (isSelected) {
 return "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 font-medium";
 }
 if (isAvailable) {
 return "border-slate-200 bg-white/50 hover:border-slate-300";
 }
 return "border-slate-200/50 bg-slate-100/50 opacity-50 cursor-not-allowed";
}

function DormBedCard({ bed, isSelected, disabled, onSelect }: DormBedCardProps) {
 const cardStyle = getBedCardStyle(isSelected, bed.isAvailable);

 return (
 <button
 type="button"
 disabled={disabled || !bed.isAvailable}
 onClick={() => onSelect(bed)}
 className={`p-2.5 rounded-xl border text-left text-xs transition-all min-h-[44px] flex items-center justify-between ${cardStyle}`}
 >
 <div>
 <div className="font-semibold text-slate-800 ">{bed.bedNumber}</div>
 <div className="text-[11px] text-slate-500 ">
 {bed.dormBlock} {bed.hasLocker ? "• Locker" : ""}
 </div>
 </div>
 <StatusBadge
 status={bed.isAvailable ? "CLEAN" : "OCCUPIED"}
 label={bed.isAvailable ? "Free" : "Taken"}
 color={bed.isAvailable ? "green" : "red"}
 size="sm"
 />
 </button>
 );
}

function DormBedSelector({
 beds,
 selectedBedId,
 nightlyRateLkr,
 disabled,
 onSelectBed,
}: DormBedSelectorProps) {
 const availableCount = beds.filter((b) => b.isAvailable).length;

 if (availableCount === 0) {
 return (
 <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 ">
 Chauffeur dormitory is fully occupied. Please select Outside Allowance Voucher.
 </div>
 );
 }

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span className="font-medium text-slate-700 ">
 Select On-Site Bed ({availableCount} of {beds.length} available)
 </span>
 <span className="text-slate-500 font-mono tabular-nums-lkr">
 Rate: {formatLkr(nightlyRateLkr)}/night
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {beds.map((bed) => (
 <DormBedCard
 key={bed.id}
 bed={bed}
 isSelected={selectedBedId === bed.id}
 disabled={disabled}
 onSelect={onSelectBed}
 />
 ))}
 </div>
 </div>
 );
}

interface OutsideAllowanceProps {
 readonly nights: number;
 readonly nightlyRateLkr: number;
 readonly voucherCode: string;
}

function OutsideAllowanceCard({ nights, nightlyRateLkr, voucherCode }: OutsideAllowanceProps) {
 const total = nightlyRateLkr * Math.max(1, nights);

 return (
 <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-indigo-900 ">
 Outside Rest House Cash Allowance
 </span>
 <span className="font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px]">
 {voucherCode}
 </span>
 </div>
 <p className="text-xs text-indigo-700 leading-relaxed">
 Issued when on-site driver dormitory is full or guest chauffeur prefers local guesthouse
 lodging. The allowance of {formatLkr(nightlyRateLkr)}/night is disbursed to the driver upon
 check-in.
 </p>
 <div className="flex justify-between items-center text-xs pt-1 border-t border-indigo-200/50 ">
 <span className="text-slate-600 ">
 Allowance ({nights} night{nights > 1 ? "s" : ""}):
 </span>
 <span className="font-bold text-slate-900 tabular-nums-lkr">
 {formatLkr(total)}
 </span>
 </div>
 </div>
 );
}

interface DriverDemographicsProps {
 readonly name: string;
 readonly phone: string;
 readonly vehicle: string;
 readonly agency: string;
 readonly includeMeals: boolean;
 readonly mealRateLkr: number;
 readonly phoneValidation: { readonly isValid: boolean; readonly error?: string | undefined };
 readonly disabled: boolean;
 readonly onNameChange: (val: string) => void;
 readonly onPhoneChange: (val: string) => void;
 readonly onVehicleChange: (val: string) => void;
 readonly onAgencyChange: (val: string) => void;
 readonly onMealsToggle: (val: boolean) => void;
}

function DriverDemographicsInputs({
 name,
 phone,
 vehicle,
 agency,
 includeMeals,
 mealRateLkr,
 phoneValidation,
 disabled,
 onNameChange,
 onPhoneChange,
 onVehicleChange,
 onAgencyChange,
 onMealsToggle,
}: DriverDemographicsProps) {
 const nameId = useId();
 const phoneId = useId();
 const vehicleId = useId();
 const agencyId = useId();

 return (
 <div className="space-y-3 pt-2 border-t border-slate-200/60 ">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={nameId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Chauffeur / Driver Name *
 </label>
 <input
 id={nameId}
 type="text"
 value={name}
 disabled={disabled}
 onChange={(e) => onNameChange(e.target.value)}
 placeholder="e.g. Sunil Perera"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label
 htmlFor={phoneId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Mobile Number (Sri Lanka +94) *
 </label>
 <input
 id={phoneId}
 type="tel"
 value={phone}
 disabled={disabled}
 onChange={(e) => onPhoneChange(e.target.value)}
 placeholder="0771234567 or +94771234567"
 className={`w-full px-3 py-2 text-xs rounded-xl border bg-white/70 text-slate-900 font-mono min-h-[44px] focus:outline-none focus:ring-2 ${
 phone && !phoneValidation.isValid
 ? "border-red-400 focus:ring-red-500"
 : "border-slate-300 focus:ring-blue-500"
 }`}
 />
 {phone && !phoneValidation.isValid && (
 <p className="text-[11px] text-red-500 mt-1">{phoneValidation.error}</p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={vehicleId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Vehicle Registration Number
 </label>
 <input
 id={vehicleId}
 type="text"
 value={vehicle}
 disabled={disabled}
 onChange={(e) => onVehicleChange(e.target.value)}
 placeholder="e.g. WP CAD-4821 / SP GA-1234"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 text-slate-900 uppercase font-mono min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label
 htmlFor={agencyId}
 className="block text-xs font-medium text-slate-600 mb-1"
 >
 Tour Agency / Chauffeur Company
 </label>
 <input
 id={agencyId}
 type="text"
 value={agency}
 disabled={disabled}
 onChange={(e) => onAgencyChange(e.target.value)}
 placeholder="e.g. Jetwing / Aitken Spence / Freelance"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white/70 text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer min-h-[44px] pt-1">
 <input
 type="checkbox"
 checked={includeMeals}
 disabled={disabled}
 onChange={(e) => onMealsToggle(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 "
 />
 <span>Include Staff Cafeteria Meals (+{formatLkr(mealRateLkr)}/night food voucher)</span>
 </label>
 </div>
 );
}

interface CostSummaryProps {
 readonly mode: DriverQuartersMode;
 readonly nights: number;
 readonly totalBedCostLkr: number;
 readonly totalOutsideAllowanceLkr: number;
 readonly totalMealCostLkr: number;
 readonly grandTotalLkr: number;
}

function CostSummary({
 mode,
 nights,
 totalBedCostLkr,
 totalOutsideAllowanceLkr,
 totalMealCostLkr,
 grandTotalLkr,
}: CostSummaryProps) {
 return (
 <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5 text-xs">
 <div className="flex justify-between text-slate-600 ">
 <span>
 {mode === "ON_SITE_BED" ? "Dormitory Lodging" : "Outside Lodging Allowance"} ({nights}{" "}
 night{nights > 1 ? "s" : ""}):
 </span>
 <span className="font-mono tabular-nums-lkr text-slate-900 ">
 {formatLkr(mode === "ON_SITE_BED" ? totalBedCostLkr : totalOutsideAllowanceLkr)}
 </span>
 </div>

 {totalMealCostLkr > 0 && (
 <div className="flex justify-between text-slate-600 ">
 <span>Cafeteria Meal Vouchers:</span>
 <span className="font-mono tabular-nums-lkr text-slate-900 ">
 {formatLkr(totalMealCostLkr)}
 </span>
 </div>
 )}

 <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 ">
 <span>Total Driver Quarters Addition:</span>
 <span className="font-mono tabular-nums-lkr text-blue-600 ">
 {formatLkr(grandTotalLkr)}
 </span>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function DriverQuartersSubform({
 value,
 onChange,
 availableBeds = DEFAULT_AVAILABLE_BEDS,
 nightsCount = 1,
 defaultBedRateLkr = DEFAULT_BED_RATE_LKR,
 defaultMealRateLkr = DEFAULT_MEAL_RATE_LKR,
 defaultOutsideAllowanceLkr = DEFAULT_OUTSIDE_ALLOWANCE_LKR,
 disabled = false,
 className = "",
}: DriverQuartersSubformProps) {
 const [accompanying, setAccompanying] = useState<boolean>(value?.driverAccompanying ?? false);
 const [mode, setMode] = useState<DriverQuartersMode>(value?.mode ?? "ON_SITE_BED");
 const [assignedBedId, setAssignedBedId] = useState<string | undefined>(value?.assignedBedId);
 const [assignedBedNumber, setAssignedBedNumber] = useState<string | undefined>(
 value?.assignedBedNumber,
 );
 const [driverName, setDriverName] = useState<string>(value?.driverName ?? "");
 const [driverPhone, setDriverPhone] = useState<string>(value?.driverPhone ?? "");
 const [vehicleNumber, setVehicleNumber] = useState<string>(value?.vehicleNumber ?? "");
 const [tourAgency, setTourAgency] = useState<string>(value?.tourAgency ?? "");
 const [includeMeals, setIncludeMeals] = useState<boolean>(value?.includeMeals ?? false);

 const modeOptions: ReadonlyArray<SegmentedControlOption<DriverQuartersMode>> = useMemo(
 () => [
 {
 id: "ON_SITE_BED",
 label: "On-Site Dorm Bed",
 },
 {
 id: "OUTSIDE_ALLOWANCE",
 label: "Outside Allowance Voucher",
 },
 ],
 [],
 );

 const phoneValidation = useMemo(() => validateSriLankanDriverPhone(driverPhone), [driverPhone]);

 const emitChange = (overrides?: Partial<Parameters<typeof buildDriverQuartersPacket>[0]>) => {
 const packet = buildDriverQuartersPacket({
 accompanying,
 mode,
 bedId: assignedBedId,
 bedNumber: assignedBedNumber,
 name: driverName,
 phone: driverPhone,
 vehicle: vehicleNumber,
 agency: tourAgency,
 includeMeals,
 nights: nightsCount,
 bedRate: defaultBedRateLkr,
 mealRate: defaultMealRateLkr,
 outsideRate: defaultOutsideAllowanceLkr,
 ...overrides,
 });
 onChange?.(packet);
 };

 const handleToggle = (checked: boolean) => {
 setAccompanying(checked);
 emitChange({ accompanying: checked });
 };

 const handleModeChange = (newMode: DriverQuartersMode) => {
 setMode(newMode);
 emitChange({ mode: newMode });
 };

 const handleSelectBed = (bed: DriverBedOption) => {
 setAssignedBedId(bed.id);
 setAssignedBedNumber(bed.bedNumber);
 emitChange({ bedId: bed.id, bedNumber: bed.bedNumber });
 };

 const cost = calculateDriverQuartersCost(
 mode,
 nightsCount,
 defaultBedRateLkr,
 defaultMealRateLkr,
 defaultOutsideAllowanceLkr,
 includeMeals,
 );

 return (
 <GlassCard material="thin" radius="lg" className={`p-4 space-y-4 ${className}`}>
 <DriverHeader accompanying={accompanying} disabled={disabled} onToggle={handleToggle} />

 {accompanying && (
 <div className="space-y-4 pt-2 border-t border-slate-200/60 ">
 <SegmentedControl<DriverQuartersMode>
 value={mode}
 onChange={handleModeChange}
 options={modeOptions}
 size="sm"
 disabled={disabled}
 />

 {mode === "ON_SITE_BED" ? (
 <DormBedSelector
 beds={availableBeds}
 selectedBedId={assignedBedId}
 nightlyRateLkr={defaultBedRateLkr}
 disabled={disabled}
 onSelectBed={handleSelectBed}
 />
 ) : (
 <OutsideAllowanceCard
 nights={nightsCount}
 nightlyRateLkr={defaultOutsideAllowanceLkr}
 voucherCode={generateDriverVoucherCode(driverPhone)}
 />
 )}

 <DriverDemographicsInputs
 name={driverName}
 phone={driverPhone}
 vehicle={vehicleNumber}
 agency={tourAgency}
 includeMeals={includeMeals}
 mealRateLkr={defaultMealRateLkr}
 phoneValidation={phoneValidation}
 disabled={disabled}
 onNameChange={(val) => {
 setDriverName(val);
 emitChange({ name: val });
 }}
 onPhoneChange={(val) => {
 setDriverPhone(val);
 emitChange({ phone: val });
 }}
 onVehicleChange={(val) => {
 setVehicleNumber(val);
 emitChange({ vehicle: val });
 }}
 onAgencyChange={(val) => {
 setTourAgency(val);
 emitChange({ agency: val });
 }}
 onMealsToggle={(val) => {
 setIncludeMeals(val);
 emitChange({ includeMeals: val });
 }}
 />

 <CostSummary
 mode={mode}
 nights={nightsCount}
 totalBedCostLkr={cost.totalBedCostLkr}
 totalOutsideAllowanceLkr={cost.totalOutsideAllowanceLkr}
 totalMealCostLkr={cost.totalMealCostLkr}
 grandTotalLkr={cost.grandTotalLkr}
 />
 </div>
 )}
 </GlassCard>
 );
}
