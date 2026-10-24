import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { formatLkr } from "../../lib/i18n.js";
import {
  DEFAULT_CBSL_USD_RATE,
  type FourStageTaxBreakdown,
  type ResidencyTier,
  calculateFourStageTax,
} from "./DirectBookingEngine.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AddonCategory =
  | "AIRPORT_TRANSFER"
  | "WILDLIFE_SAFARI"
  | "DRIVER_QUARTERS"
  | "WELLNESS_EXPERIENCE";

export type TransferType = "ONE_WAY_PICKUP" | "ONE_WAY_DROPOFF" | "ROUND_TRIP";

export type SafariPark = "YALA" | "UDAWALAWE" | "WILPATTU" | "MINNERIYA";

export type SafariSlot = "DAWN_0530" | "DUSK_1430";

export type SpaSlot = "MORNING" | "AFTERNOON" | "EVENING";

export interface AddonItem {
  readonly id: string;
  readonly category: AddonCategory;
  readonly title: string;
  readonly sinhalaTitle: string;
  readonly tamilTitle: string;
  readonly description: string;
  readonly badge?: string;
  readonly priceResidentLkr: number;
  readonly priceForeignUsd: number;
  readonly unitText: string;
  readonly isComplimentary: boolean;
  readonly imageUrl: string;
}

export interface AirportTransferDetails {
  readonly transferType: TransferType;
  readonly flightNumber: string;
  readonly dateTime: string;
  readonly passengerCount: number;
  readonly specialRequests: string;
}

export interface SafariJeepDetails {
  readonly park: SafariPark;
  readonly slot: SafariSlot;
  readonly date: string;
  readonly guestCount: number;
  readonly binocularsRequested: boolean;
}

export interface DriverQuartersDetails {
  readonly driverName: string;
  readonly driverPhone: string;
  readonly vehiclePlateNumber: string;
  readonly driverNicOrLicense: string;
  readonly dormBedConfirmed: boolean;
}

export interface AyurvedicSpaDetails {
  readonly personsCount: number;
  readonly preferredSlot: SpaSlot;
  readonly treatmentType: string;
}

export interface AddonsState {
  readonly airportTransferSelected: boolean;
  readonly airportTransferDetails: AirportTransferDetails;
  readonly safariJeepSelected: boolean;
  readonly safariJeepDetails: SafariJeepDetails;
  readonly driverQuartersSelected: boolean;
  readonly driverQuartersDetails: DriverQuartersDetails;
  readonly ayurvedicSpaSelected: boolean;
  readonly ayurvedicSpaDetails: AyurvedicSpaDetails;
}

export interface SelectedAddonDetail {
  readonly addonId: string;
  readonly category: AddonCategory;
  readonly title: string;
  readonly unitPriceLkr: number;
  readonly unitPriceUsd: number;
  readonly quantity: number;
  readonly totalLkr: number;
  readonly totalUsd: number;
  readonly isComplimentary: boolean;
  readonly summaryDescription: string;
}

export interface BookingAddonsSummary {
  readonly roomTotalLkr: number;
  readonly roomTotalUsd: number;
  readonly addonsNetLkr: number;
  readonly addonsNetUsd: number;
  readonly addonsTaxBreakdown: FourStageTaxBreakdown;
  readonly grandTotalLkr: number;
  readonly grandTotalUsd: number;
  readonly selectedAddons: ReadonlyArray<SelectedAddonDetail>;
  readonly driverBedRequested: boolean;
}

export interface BookingAddonsStepProps {
  readonly tenantId?: string | undefined;
  readonly residencyTier?: ResidencyTier | undefined;
  readonly roomSubtotalLkr?: number | undefined;
  readonly cbslUsdExchangeRate?: number | undefined;
  readonly initialAddons?: ReadonlyArray<AddonItem> | undefined;
  readonly initialAddonsState?: Partial<AddonsState> | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onSkip?: (() => void) | undefined;
  readonly onContinueToCheckout?:
    | ((summary: BookingAddonsSummary) => Promise<void> | void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Addon Data & Catalog
// ============================================================================

export const DEFAULT_AIRPORT_TRANSFER_DETAILS: AirportTransferDetails = {
  transferType: "ONE_WAY_PICKUP",
  flightNumber: "UL 504",
  dateTime: "2026-11-15T14:30",
  passengerCount: 2,
  specialRequests: "Cold towels & baby car seat requested",
};

export const DEFAULT_SAFARI_JEEP_DETAILS: SafariJeepDetails = {
  park: "YALA",
  slot: "DAWN_0530",
  date: "2026-11-16",
  guestCount: 2,
  binocularsRequested: true,
};

export const DEFAULT_DRIVER_QUARTERS_DETAILS: DriverQuartersDetails = {
  driverName: "Sunil Shantha",
  driverPhone: "+94771234567",
  vehiclePlateNumber: "WP CAA-4821",
  driverNicOrLicense: "198214503210",
  dormBedConfirmed: true,
};

export const DEFAULT_AYURVEDIC_SPA_DETAILS: AyurvedicSpaDetails = {
  personsCount: 2,
  preferredSlot: "AFTERNOON",
  treatmentType: "Shirodhara & Full Body Herbal Oil Massage",
};

export const DEFAULT_ADDONS_STATE: AddonsState = {
  airportTransferSelected: false,
  airportTransferDetails: DEFAULT_AIRPORT_TRANSFER_DETAILS,
  safariJeepSelected: false,
  safariJeepDetails: DEFAULT_SAFARI_JEEP_DETAILS,
  driverQuartersSelected: false,
  driverQuartersDetails: DEFAULT_DRIVER_QUARTERS_DETAILS,
  ayurvedicSpaSelected: false,
  ayurvedicSpaDetails: DEFAULT_AYURVEDIC_SPA_DETAILS,
};

export const DEFAULT_ADDONS: ReadonlyArray<AddonItem> = [
  {
    id: "addon-bia-transfer",
    category: "AIRPORT_TRANSFER",
    title: "Bandaranaike Int'l Airport (BIA) Private Transfer",
    sinhalaTitle: "බණ්ඩාරනායක ජාත්යන්තර ගුවන්තොටුපළ ප්රවාහනය",
    tamilTitle: "பண்டாரநாயக்க விமான நிலைய போக்குவரத்து",
    description:
      "Private luxury AC sedan or commuter van directly from/to Katunayake (CMB). Includes iced king coconut water, chilled Ceylon wet towels, and expressway tolls.",
    badge: "Most Convenient",
    priceResidentLkr: 24000,
    priceForeignUsd: 80,
    unitText: "per vehicle (one-way)",
    isComplimentary: false,
    imageUrl: "/images/boutique-courtyard-login.jpg",
  },
  {
    id: "addon-wildlife-safari",
    category: "WILDLIFE_SAFARI",
    title: "Private 4x4 Wildlife Safari Jeep Expedition",
    sinhalaTitle: "වනජීවී සෆාරි ජීප් රථ චාරිකාව (යාල / උඩවලව)",
    tamilTitle: "வனவிலங்கு சவாரி ஜீப் பயணம்",
    description:
      "Customized elevated open-top 4x4 safari cruiser with an experienced licensed Department of Wildlife tracker. Experience leopards, Asian elephants, and sloth bears.",
    badge: "Signature Island Tour",
    priceResidentLkr: 36000,
    priceForeignUsd: 120,
    unitText: "per private jeep (up to 6 pax)",
    isComplimentary: false,
    imageUrl: "/images/room-beachfront-pool-villa.jpg",
  },
  {
    id: "addon-driver-quarters",
    category: "DRIVER_QUARTERS",
    title: "Complimentary Chauffeur & Guide Quarters",
    sinhalaTitle: "නොමිලේ රියදුරු නවාතැන් හා ආහාර පහසුකම්",
    tamilTitle: "இலவச சாரதி தங்குமிடம் மற்றும் உணவு",
    description:
      "Traditional Sri Lankan hospitality courtesy: complimentary dormitory bed, locker, and cafeteria meals for your accompanying registered chauffeur/tourist guide.",
    badge: "Complimentary Courtesy",
    priceResidentLkr: 0,
    priceForeignUsd: 0,
    unitText: "Free of Charge (LKR 0)",
    isComplimentary: true,
    imageUrl: "/images/dish-jaffna-crab-hoppers.jpg",
  },
  {
    id: "addon-ayurvedic-spa",
    category: "WELLNESS_EXPERIENCE",
    title: "Authentic Ceylon Ayurvedic Herbal Massage & Steam Bath",
    sinhalaTitle: "දේශීය ආයුර්වේද සුවතා සම්බාහනය",
    tamilTitle: "பாரம்பரிய ஆயுர்வேத சிகிச்சை",
    description:
      "60-minute rejuvenating full-body therapy with warm medicated herbal oils (Kalyanaka thailaya) followed by traditional Ceylon Kohomba steam bath infusion.",
    badge: "Holistic Wellness",
    priceResidentLkr: 12000,
    priceForeignUsd: 40,
    unitText: "per person (60 min)",
    isComplimentary: false,
    imageUrl: "/images/spa-ayurveda-pavilion.jpg",
  },
];

// ============================================================================
// Addons Summary Calculator
// ============================================================================

export function buildAirportTransferDetail(details: AirportTransferDetails): SelectedAddonDetail {
  const isRoundTrip = details.transferType === "ROUND_TRIP";
  const multiplier = isRoundTrip ? 2 : 1;
  const unitPriceLkr = 24000;
  const unitPriceUsd = 80;
  return {
    addonId: "addon-bia-transfer",
    category: "AIRPORT_TRANSFER",
    title: "BIA Katunayake Airport Transfer",
    unitPriceLkr,
    unitPriceUsd,
    quantity: multiplier,
    totalLkr: unitPriceLkr * multiplier,
    totalUsd: unitPriceUsd * multiplier,
    isComplimentary: false,
    summaryDescription: `${isRoundTrip ? "Round-Trip Transfer" : "One-Way Transfer"} • Flight: ${details.flightNumber || "TBD"}`,
  };
}

export function buildSafariJeepDetail(details: SafariJeepDetails): SelectedAddonDetail {
  const unitPriceLkr = 36000;
  const unitPriceUsd = 120;
  return {
    addonId: "addon-wildlife-safari",
    category: "WILDLIFE_SAFARI",
    title: "Private 4x4 Wildlife Safari Jeep",
    unitPriceLkr,
    unitPriceUsd,
    quantity: 1,
    totalLkr: unitPriceLkr,
    totalUsd: unitPriceUsd,
    isComplimentary: false,
    summaryDescription: `${details.park} National Park • ${details.slot === "DAWN_0530" ? "Dawn (5:30 AM)" : "Dusk (2:30 PM)"}`,
  };
}

export function buildDriverQuartersDetail(details: DriverQuartersDetails): SelectedAddonDetail {
  return {
    addonId: "addon-driver-quarters",
    category: "DRIVER_QUARTERS",
    title: "Complimentary Chauffeur & Guide Quarters",
    unitPriceLkr: 0,
    unitPriceUsd: 0,
    quantity: 1,
    totalLkr: 0,
    totalUsd: 0,
    isComplimentary: true,
    summaryDescription: `Free Driver Dorm Bed & Meals • Driver: ${details.driverName || "Registered Driver"} (${details.vehiclePlateNumber || "Vehicle"})`,
  };
}

export function buildAyurvedicSpaDetail(details: AyurvedicSpaDetails): SelectedAddonDetail {
  const count = Math.max(1, details.personsCount);
  const unitPriceLkr = 12000;
  const unitPriceUsd = 40;
  return {
    addonId: "addon-ayurvedic-spa",
    category: "WELLNESS_EXPERIENCE",
    title: "Ceylon Ayurvedic Herbal Massage",
    unitPriceLkr,
    unitPriceUsd,
    quantity: count,
    totalLkr: unitPriceLkr * count,
    totalUsd: unitPriceUsd * count,
    isComplimentary: false,
    summaryDescription: `${count} Guest${count > 1 ? "s" : ""} • ${details.preferredSlot} Session`,
  };
}

export function calculateAddonsSummary(
  state: AddonsState,
  residencyTier: ResidencyTier = "RESIDENT_LKR",
  roomSubtotalLkr = 42000,
  exchangeRate: number = DEFAULT_CBSL_USD_RATE,
): BookingAddonsSummary {
  const selectedList: SelectedAddonDetail[] = [];

  if (state.airportTransferSelected) {
    selectedList.push(buildAirportTransferDetail(state.airportTransferDetails));
  }
  if (state.safariJeepSelected) {
    selectedList.push(buildSafariJeepDetail(state.safariJeepDetails));
  }
  if (state.driverQuartersSelected) {
    selectedList.push(buildDriverQuartersDetail(state.driverQuartersDetails));
  }
  if (state.ayurvedicSpaSelected) {
    selectedList.push(buildAyurvedicSpaDetail(state.ayurvedicSpaDetails));
  }

  // Net Add-ons total
  const addonsNetLkr = selectedList.reduce((acc, item) => acc + item.totalLkr, 0);
  const addonsNetUsd = selectedList.reduce((acc, item) => acc + item.totalUsd, 0);

  // 4-Stage Tax compounding on Add-ons
  const addonsTaxBreakdown = calculateFourStageTax(addonsNetLkr, exchangeRate);

  // Grand Totals (Room Subtotal + Addons Grand Total)
  const roomTax = calculateFourStageTax(roomSubtotalLkr, exchangeRate);
  const roomTotalLkr = roomTax.grandTotalLkr;
  const roomTotalUsd = roomTax.grandTotalUsd;

  const grandTotalLkr = roomTotalLkr + addonsTaxBreakdown.grandTotalLkr;
  const grandTotalUsd =
    residencyTier === "FOREIGN_USD"
      ? roomTotalUsd + addonsTaxBreakdown.grandTotalUsd
      : Math.round((grandTotalLkr / exchangeRate) * 100) / 100;

  return {
    roomTotalLkr,
    roomTotalUsd,
    addonsNetLkr,
    addonsNetUsd,
    addonsTaxBreakdown,
    grandTotalLkr,
    grandTotalUsd,
    selectedAddons: selectedList,
    driverBedRequested: state.driverQuartersSelected,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StepProgressHeaderProps {
  readonly residencyTier: ResidencyTier;
}

function StepProgressHeader({ residencyTier }: StepProgressHeaderProps) {
  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0B6E4F]">
        <span>Step 2 of 3</span>
        <span>•</span>
        <span>Curated Island Add-Ons</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-apple-gray-900 ">
        Enhance Your Ceylon Journey
      </h1>
      <p className="text-sm text-apple-gray-600 ">
        Add seamless airport pickups, wildlife safari adventures, or complimentary chauffeur lodging
        before completing your reservation.{" "}
        <span className="font-medium text-apple-gray-700 ">
          (Tariffs displayed in {residencyTier === "RESIDENT_LKR" ? "LKR" : "USD"})
        </span>
      </p>
    </div>
  );
}

interface PriceTagProps {
  readonly residentLkr: number;
  readonly foreignUsd: number;
  readonly unitText: string;
  readonly isComplimentary: boolean;
  readonly residencyTier: ResidencyTier;
}

function AddonPriceDisplay({
  residentLkr,
  foreignUsd,
  unitText,
  isComplimentary,
  residencyTier,
}: PriceTagProps) {
  if (isComplimentary) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-bold text-emerald-600 ">FREE COURTESY</span>
        <span className="text-xs text-apple-gray-500">({unitText})</span>
      </div>
    );
  }

  const isResident = residencyTier === "RESIDENT_LKR";
  const displayPrice = isResident ? formatLkr(residentLkr) : `USD ${foreignUsd.toFixed(2)}`;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-bold text-apple-gray-900 tabular-nums-lkr">
        {displayPrice}
      </span>
      <span className="text-xs text-apple-gray-500">{unitText}</span>
    </div>
  );
}

interface AirportTransferSubformProps {
  readonly details: AirportTransferDetails;
  readonly onChange: (details: AirportTransferDetails) => void;
}

function AirportTransferSubform({ details, onChange }: AirportTransferSubformProps) {
  const flightId = useId();
  const dateId = useId();
  const paxId = useId();
  const requestsId = useId();

  return (
    <div className="mt-4 pt-4 border-t border-apple-gray-200 space-y-3">
      <div>
        <span className="block text-xs font-semibold text-apple-gray-700 mb-1.5">
          Transfer Direction &amp; Service Type
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "ONE_WAY_PICKUP", label: "Pickup (CMB → Hotel)" },
              { id: "ONE_WAY_DROPOFF", label: "Dropoff (Hotel → CMB)" },
              { id: "ROUND_TRIP", label: "Round-Trip (2-Way)" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ ...details, transferType: item.id })}
              className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                details.transferType === item.id
                  ? "bg-[#0B6E4F] text-white border-apple-blue shadow-sm"
                  : "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 hover:bg-apple-gray-200 "
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={flightId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Flight Number
          </label>
          <input
            id={flightId}
            type="text"
            value={details.flightNumber}
            onChange={(e) => onChange({ ...details, flightNumber: e.target.value })}
            placeholder="e.g. UL 504 / EK 652"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
        <div>
          <label htmlFor={dateId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Flight Date &amp; Arrival Time
          </label>
          <input
            id={dateId}
            type="datetime-local"
            value={details.dateTime}
            onChange={(e) => onChange({ ...details, dateTime: e.target.value })}
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={paxId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Luggage &amp; Passenger Count
          </label>
          <input
            id={paxId}
            type="number"
            min={1}
            max={8}
            value={details.passengerCount}
            onChange={(e) =>
              onChange({ ...details, passengerCount: Math.max(1, Number(e.target.value)) })
            }
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
        <div>
          <label
            htmlFor={requestsId}
            className="block text-xs font-medium text-apple-gray-600 mb-1"
          >
            Special Requests / Child Seat
          </label>
          <input
            id={requestsId}
            type="text"
            value={details.specialRequests}
            onChange={(e) => onChange({ ...details, specialRequests: e.target.value })}
            placeholder="e.g. Toddler car seat, surfboards"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>
    </div>
  );
}

interface SafariJeepSubformProps {
  readonly details: SafariJeepDetails;
  readonly onChange: (details: SafariJeepDetails) => void;
}

function SafariJeepSubform({ details, onChange }: SafariJeepSubformProps) {
  const dateId = useId();
  const paxId = useId();
  const binocularId = useId();

  return (
    <div className="mt-4 pt-4 border-t border-apple-gray-200 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="block text-xs font-medium text-apple-gray-600 mb-1">
            National Park Destination
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "YALA", label: "Yala National Park" },
                { id: "UDAWALAWE", label: "Udawalawe Elephants" },
                { id: "WILPATTU", label: "Wilpattu Natural Lakes" },
                { id: "MINNERIYA", label: "Minneriya Gathering" },
              ] as const
            ).map((park) => (
              <button
                key={park.id}
                type="button"
                onClick={() => onChange({ ...details, park: park.id })}
                className={`min-h-[44px] px-2 py-1 text-xs font-medium rounded-xl border transition-all text-center ${
                  details.park === park.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 "
                }`}
              >
                {park.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-apple-gray-600 mb-1">
            Game Drive Time Slot
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...details, slot: "DAWN_0530" })}
              className={`min-h-[44px] px-2 py-1 text-xs font-medium rounded-xl border transition-all text-center ${
                details.slot === "DAWN_0530"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 "
              }`}
            >
              Dawn Safari (05:30 AM)
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...details, slot: "DUSK_1430" })}
              className={`min-h-[44px] px-2 py-1 text-xs font-medium rounded-xl border transition-all text-center ${
                details.slot === "DUSK_1430"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 "
              }`}
            >
              Dusk Safari (02:30 PM)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={dateId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Expedition Date
          </label>
          <input
            id={dateId}
            type="date"
            value={details.date}
            onChange={(e) => onChange({ ...details, date: e.target.value })}
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
        <div>
          <label htmlFor={paxId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Number of Safari Guests (Max 6 per Jeep)
          </label>
          <input
            id={paxId}
            type="number"
            min={1}
            max={6}
            value={details.guestCount}
            onChange={(e) =>
              onChange({ ...details, guestCount: Math.min(6, Math.max(1, Number(e.target.value))) })
            }
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id={binocularId}
          type="checkbox"
          checked={details.binocularsRequested}
          onChange={(e) => onChange({ ...details, binocularsRequested: e.target.checked })}
          className="w-4 h-4 rounded text-[#0B6E4F] border-apple-gray-300 focus:ring-apple-blue"
        />
        <label htmlFor={binocularId} className="text-xs text-apple-gray-700 cursor-pointer">
          Include professional Bushnell 10x42 wildlife binoculars for all guests (Complimentary)
        </label>
      </div>
    </div>
  );
}

interface DriverQuartersSubformProps {
  readonly details: DriverQuartersDetails;
  readonly onChange: (details: DriverQuartersDetails) => void;
  readonly onOpenPolicyModal: () => void;
}

function DriverQuartersSubform({
  details,
  onChange,
  onOpenPolicyModal,
}: DriverQuartersSubformProps) {
  const nameId = useId();
  const phoneId = useId();
  const plateId = useId();
  const nicId = useId();

  return (
    <div className="mt-4 pt-4 border-t border-apple-gray-200 space-y-3">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-900 ">
            Sri Lankan Driver Hospitality Commitment
          </p>
          <p className="text-xs text-emerald-700 ">
            We provide our on-site chauffeur quarters with air conditioning, hot water showers,
            secure lockers, and 3 cafeteria meals daily at zero cost.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPolicyModal}
          className="shrink-0 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          View Policy
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={nameId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Chauffeur / Driver Full Name
          </label>
          <input
            id={nameId}
            type="text"
            value={details.driverName}
            onChange={(e) => onChange({ ...details, driverName: e.target.value })}
            placeholder="e.g. Sunil Shantha"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
        <div>
          <label htmlFor={phoneId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Driver Mobile Phone Number
          </label>
          <input
            id={phoneId}
            type="tel"
            value={details.driverPhone}
            onChange={(e) => onChange({ ...details, driverPhone: e.target.value })}
            placeholder="+94 77 123 4567"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={plateId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Vehicle License Plate Number
          </label>
          <input
            id={plateId}
            type="text"
            value={details.vehiclePlateNumber}
            onChange={(e) => onChange({ ...details, vehiclePlateNumber: e.target.value })}
            placeholder="e.g. WP CAA-4821 / SP KX-9876"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
        <div>
          <label htmlFor={nicId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Driver National ID (NIC) / Driving License
          </label>
          <input
            id={nicId}
            type="text"
            value={details.driverNicOrLicense}
            onChange={(e) => onChange({ ...details, driverNicOrLicense: e.target.value })}
            placeholder="e.g. 198214503210 or B1234567"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>
    </div>
  );
}

interface AyurvedicSpaSubformProps {
  readonly details: AyurvedicSpaDetails;
  readonly onChange: (details: AyurvedicSpaDetails) => void;
}

function AyurvedicSpaSubform({ details, onChange }: AyurvedicSpaSubformProps) {
  const paxId = useId();

  return (
    <div className="mt-4 pt-4 border-t border-apple-gray-200 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={paxId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Number of Persons for Therapy
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({ ...details, personsCount: Math.max(1, details.personsCount - 1) })
              }
              aria-label="Decrease spa guests count"
              className="w-11 h-11 rounded-xl bg-apple-gray-100 border border-apple-gray-300 font-bold text-apple-gray-700 flex items-center justify-center hover:bg-apple-gray-200 transition-colors"
            >
              -
            </button>
            <span className="w-12 text-center text-sm font-bold text-apple-gray-900 tabular-nums-lkr">
              {details.personsCount}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({ ...details, personsCount: Math.min(8, details.personsCount + 1) })
              }
              aria-label="Increase spa guests count"
              className="w-11 h-11 rounded-xl bg-apple-gray-100 border border-apple-gray-300 font-bold text-apple-gray-700 flex items-center justify-center hover:bg-apple-gray-200 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-apple-gray-600 mb-1">
            Preferred Time of Day
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: "MORNING", label: "Morning" },
                { id: "AFTERNOON", label: "Afternoon" },
                { id: "EVENING", label: "Evening" },
              ] as const
            ).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => onChange({ ...details, preferredSlot: slot.id })}
                className={`min-h-[44px] px-1 py-1 text-xs font-medium rounded-xl border transition-all text-center ${
                  details.preferredSlot === slot.id
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 "
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddonCardProps {
  readonly addon: AddonItem;
  readonly isSelected: boolean;
  readonly residencyTier: ResidencyTier;
  readonly onToggle: (selected: boolean) => void;
  readonly children?: React.ReactNode;
}

function AddonCard({ addon, isSelected, residencyTier, onToggle, children }: AddonCardProps) {
  return (
    <GlassCard
      material="regular"
      className={`p-4 sm:p-5 transition-all duration-300 border ${
        isSelected
          ? "border-apple-blue/60 shadow-md ring-1 ring-apple-blue/30"
          : "border-apple-gray-200/60 "
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 1:1 Squircle Image */}
        <div className="relative shrink-0 w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-apple-gray-100 ">
          <img
            src={addon.imageUrl}
            alt={addon.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {addon.badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-apple-gray-900/80 text-slate-900 backdrop-blur-md">
              {addon.badge}
            </span>
          )}
        </div>

        {/* Content & Action */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-apple-gray-900 ">{addon.title}</h3>
              <AddonPriceDisplay
                residentLkr={addon.priceResidentLkr}
                foreignUsd={addon.priceForeignUsd}
                unitText={addon.unitText}
                isComplimentary={addon.isComplimentary}
                residencyTier={residencyTier}
              />
            </div>
            <p className="text-xs font-medium text-apple-gray-500 ">
              {addon.sinhalaTitle} • {addon.tamilTitle}
            </p>
            <p className="text-xs text-apple-gray-600 line-clamp-2">{addon.description}</p>
          </div>

          {/* Toggle Action */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onToggle(!isSelected)}
              aria-label={isSelected ? `Remove ${addon.title}` : `Add ${addon.title}`}
              className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#0B6E4F] text-white shadow-sm hover:bg-[#0B6E4F]/90"
                  : "bg-apple-gray-100 text-apple-gray-900 hover:bg-apple-gray-200 "
              }`}
            >
              {isSelected ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    role="img"
                    aria-label="Selected checkmark"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Added to Booking</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    role="img"
                    aria-label="Plus icon"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{addon.isComplimentary ? "Request Bed (Free)" : "Add Option"}</span>
                </>
              )}
            </button>

            {isSelected && !addon.isComplimentary && (
              <span className="text-[11px] text-[#0B6E4F] font-medium">
                Included in order summary
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Configuration Subform */}
      {isSelected && children}
    </GlassCard>
  );
}

interface FloatingBarProps {
  readonly summary: BookingAddonsSummary;
  readonly residencyTier: ResidencyTier;
  readonly onSkip: () => void;
  readonly onContinue: () => void;
}

function FloatingAddonsBar({ summary, residencyTier, onSkip, onContinue }: FloatingBarProps) {
  const isResident = residencyTier === "RESIDENT_LKR";
  const displayTotal = isResident
    ? formatLkr(summary.grandTotalLkr)
    : `USD ${summary.grandTotalUsd.toFixed(2)}`;

  const addOnCount = summary.selectedAddons.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-white/85 backdrop-blur-xl border-t border-apple-gray-200/80 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Financial summary */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-apple-gray-500">
              <span>Total Stay &amp; Add-Ons:</span>
              {addOnCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0B6E4F]/10 text-[#0B6E4F] text-[10px] font-bold">
                  +{addOnCount} {addOnCount === 1 ? "Add-On" : "Add-Ons"}
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-apple-gray-900 tabular-nums-lkr">
              {displayTotal}
            </div>
          </div>

          <div className="text-right sm:text-left text-[11px] text-apple-gray-500">
            <div>Includes 4-Stage Taxes</div>
            <div>(SC, TDL, SSCL, VAT)</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 text-xs font-semibold rounded-full bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200 transition-colors text-center"
          >
            Skip Add-Ons
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 text-xs font-bold rounded-full bg-[#0B6E4F] text-white shadow-lg hover:bg-[#0B6E4F]/90 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Proceed to Checkout</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              role="img"
              aria-label="Right arrow"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DriverCourtesyModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

function DriverCourtesyModal({ isOpen, onClose }: DriverCourtesyModalProps) {
  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sri Lanka Tourist Driver & Chauffeur Courtesy Policy"
      size="md"
    >
      <div className="space-y-4 text-xs text-apple-gray-700 ">
        <p>
          In keeping with the esteemed traditions of Sri Lankan hospitality and SLTDA guidelines,
          our property is honored to host your licensed tourist chauffeur / guide at no additional
          cost throughout the duration of your stay.
        </p>
        <div className="p-3 bg-apple-gray-50 rounded-xl space-y-2">
          <h4 className="font-bold text-apple-gray-900 ">
            Complimentary Driver Amenities Included:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-apple-gray-600 ">
            <li>Single bed in our secure, air-conditioned Chauffeur Dormitory.</li>
            <li>Hot water shower and private locker with security key.</li>
            <li>Three hearty meals daily in the Staff Dining Cafeteria.</li>
            <li>Free vehicle washing bay access and overnight gated parking.</li>
          </ul>
        </div>
        <p className="text-[11px] text-apple-gray-500">
          Note: Drivers are required to present a valid SLTDA Tourist Driver Identity Card or
          National Identity Card (NIC) with driving license upon check-in.
        </p>
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-full bg-[#0B6E4F] text-white hover:bg-[#0B6E4F]/90 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Main Component: BookingAddonsStep
// ============================================================================

export function BookingAddonsStep({
  tenantId = "tenant-default",
  residencyTier = "RESIDENT_LKR",
  roomSubtotalLkr = 42000,
  cbslUsdExchangeRate = DEFAULT_CBSL_USD_RATE,
  initialAddons = DEFAULT_ADDONS,
  initialAddonsState,
  onBack,
  onSkip,
  onContinueToCheckout,
  className = "",
}: BookingAddonsStepProps) {
  // Addons State
  const [addonsState, setAddonsState] = useState<AddonsState>(() => ({
    ...DEFAULT_ADDONS_STATE,
    ...initialAddonsState,
  }));

  // Policy Modal
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Financial summary
  const summary = calculateAddonsSummary(
    addonsState,
    residencyTier,
    roomSubtotalLkr,
    cbslUsdExchangeRate,
  );

  // Subform change handlers
  const handleTransferChange = (details: AirportTransferDetails) => {
    setAddonsState((prev) => ({ ...prev, airportTransferDetails: details }));
  };

  const handleSafariChange = (details: SafariJeepDetails) => {
    setAddonsState((prev) => ({ ...prev, safariJeepDetails: details }));
  };

  const handleDriverChange = (details: DriverQuartersDetails) => {
    setAddonsState((prev) => ({ ...prev, driverQuartersDetails: details }));
  };

  const handleSpaChange = (details: AyurvedicSpaDetails) => {
    setAddonsState((prev) => ({ ...prev, ayurvedicSpaDetails: details }));
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else if (onContinueToCheckout) {
      // Proceed with no addons selected
      const emptySummary = calculateAddonsSummary(
        DEFAULT_ADDONS_STATE,
        residencyTier,
        roomSubtotalLkr,
        cbslUsdExchangeRate,
      );
      void onContinueToCheckout(emptySummary);
    }
  };

  const handleContinue = () => {
    if (onContinueToCheckout) {
      void onContinueToCheckout(summary);
    }
  };

  return (
    <div
      data-tenant={tenantId}
      className={`relative max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-36 ${className}`}
    >
      {/* Back button if provided */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-apple-gray-600 hover:text-[#0B6E4F] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
            aria-label="Back arrow"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Room Selection</span>
        </button>
      )}

      {/* Header Banner */}
      <StepProgressHeader residencyTier={residencyTier} />

      {/* Add-ons List */}
      <div className="space-y-4">
        {initialAddons.map((addon) => {
          if (addon.id === "addon-bia-transfer") {
            return (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addonsState.airportTransferSelected}
                residencyTier={residencyTier}
                onToggle={(sel) =>
                  setAddonsState((prev) => ({ ...prev, airportTransferSelected: sel }))
                }
              >
                <AirportTransferSubform
                  details={addonsState.airportTransferDetails}
                  onChange={handleTransferChange}
                />
              </AddonCard>
            );
          }

          if (addon.id === "addon-wildlife-safari") {
            return (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addonsState.safariJeepSelected}
                residencyTier={residencyTier}
                onToggle={(sel) => setAddonsState((prev) => ({ ...prev, safariJeepSelected: sel }))}
              >
                <SafariJeepSubform
                  details={addonsState.safariJeepDetails}
                  onChange={handleSafariChange}
                />
              </AddonCard>
            );
          }

          if (addon.id === "addon-driver-quarters") {
            return (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addonsState.driverQuartersSelected}
                residencyTier={residencyTier}
                onToggle={(sel) =>
                  setAddonsState((prev) => ({ ...prev, driverQuartersSelected: sel }))
                }
              >
                <DriverQuartersSubform
                  details={addonsState.driverQuartersDetails}
                  onChange={handleDriverChange}
                  onOpenPolicyModal={() => setIsDriverModalOpen(true)}
                />
              </AddonCard>
            );
          }

          if (addon.id === "addon-ayurvedic-spa") {
            return (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addonsState.ayurvedicSpaSelected}
                residencyTier={residencyTier}
                onToggle={(sel) =>
                  setAddonsState((prev) => ({ ...prev, ayurvedicSpaSelected: sel }))
                }
              >
                <AyurvedicSpaSubform
                  details={addonsState.ayurvedicSpaDetails}
                  onChange={handleSpaChange}
                />
              </AddonCard>
            );
          }

          return (
            <AddonCard
              key={addon.id}
              addon={addon}
              isSelected={false}
              residencyTier={residencyTier}
              onToggle={() => {
                /* No-op for custom preview */
              }}
            />
          );
        })}
      </div>

      {/* Floating Bottom Bar */}
      <FloatingAddonsBar
        summary={summary}
        residencyTier={residencyTier}
        onSkip={handleSkip}
        onContinue={handleContinue}
      />

      {/* Driver Courtesy Modal */}
      <DriverCourtesyModal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} />
    </div>
  );
}
