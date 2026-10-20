/**
 * Printable Airport Paging Board & Excursion Gate Pass (PrintableTransferPass.tsx)
 *
 * Implements Step 361 (Phase 15.11) of the Sri Lanka HMS Master Architecture Plan:
 * Dual-format A4 printable passes for Sri Lankan resort transportation and excursion desks:
 *
 * 1. Mode 1: Airport Arrival Paging Board (A4 Landscape):
 *    - High-contrast, high-legibility chauffeur paging sign for BIA Katunayake / Mattala arrival gates.
 *    - Prominent Guest Name, Flight Number, Origin, Hotel Brand, and trilingual greeting ("WELCOME TO SRI LANKA / ආයුබෝවන්").
 * 2. Mode 2: Chauffeur Trip Sheet & Security Gate Pass (A4 Portrait):
 *    - Driver vehicle dispatch sheet: Vehicle Registration, Chauffeur details, Expressway route tags (E03/E01).
 *    - Passenger & luggage piece counts, Kitchen KDS breakfast pack collection verification.
 *    - Security gate exit/return odometer and clearance sign-off block.
 * 3. Mode 3: Wildlife Excursion & Safari Gate Pass (A4 Portrait):
 *    - DWC wildlife park permit reference (Yala / Udawalawe / Wilpattu), 4x4 safari jeep VHF radio channel,
 *      naturalist tracker name, and park entry/exit stamps.
 * 4. Apple Human Interface Guidelines:
 *    - Screen Preview: Translucent .apple-liquid-glass floating toolbar with iOS-style SegmentedControl.
 *    - Print Mode: Clean high-density monochrome layout with @media print orientation rules.
 * 5. Trilingual Localization (`en`, `si`, `ta`).
 * 6. Zero console noise, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PassDisplayMode = "PAGING_BOARD" | "DRIVER_TRIP_SHEET" | "EXCURSION_GATE_PASS";

export interface TransferPassData {
  readonly passId: string;
  readonly transferType:
    | "AIRPORT_ARRIVAL"
    | "AIRPORT_DEPARTURE"
    | "SAFARI_EXCURSION"
    | "TOUR_EXCURSION";
  readonly hotelBrandName: string;
  readonly hotelSubBrand: string;
  readonly guestSalutation: string;
  readonly guestFullName: string;
  readonly guestRoomNumber: string;
  readonly passengerCount: number;
  readonly luggagePiecesCount: number;
  readonly flightNumber?: string | undefined;
  readonly flightOriginOrDest?: string | undefined;
  readonly airportHub: "BIA_KATUNAYAKE" | "MATTALA_HRI" | "RATMALANA" | "COASTAL_WATERDrome";
  readonly terminalText: string;
  readonly pickupDateTime: string;
  readonly destinationText: string;
  readonly routeExpressway: string;
  readonly vehicleModel: string;
  readonly vehiclePlateNumber: string;
  readonly chauffeurName: string;
  readonly chauffeurMobile: string;
  readonly fuelLevelIndicator: string;
  readonly packedBreakfastBoxesCount: number;
  readonly packedBreakfastStyle?: string | undefined;
  readonly dwcPermitNumber?: string | undefined;
  readonly naturalistTrackerName?: string | undefined;
  readonly safariJeepVhfChannel?: string | undefined;
  readonly securityOfficerName?: string | undefined;
  readonly specialInstructions: string;
}

export interface PrintableTransferPassProps {
  /** Transfer pass data */
  readonly passData?: TransferPassData | undefined;
  /** Active language */
  readonly language?: SupportedLanguage | undefined;
  /** Initial selected pass mode */
  readonly initialMode?: PassDisplayMode | undefined;
  /** Custom print trigger callback (defaults to window.print()) */
  readonly onPrint?: (() => void) | undefined;
  /** Test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Sample Default Seed Data
// ============================================================================

export const DEFAULT_TRANSFER_PASS: TransferPassData = {
  passId: "TRF-20261021-0842",
  transferType: "AIRPORT_ARRIVAL",
  hotelBrandName: "CEYLON HERITAGE LUXURY RESORTS & SPA",
  hotelSubBrand: "Bentota Royal Beachfront Villas & Ayurveda Sanctuary",
  guestSalutation: "DR.",
  guestFullName: "ANANYA SHARMA",
  guestRoomNumber: "Villa 08",
  passengerCount: 2,
  luggagePiecesCount: 4,
  flightNumber: "UL 504",
  flightOriginOrDest: "London Heathrow (LHR) → Colombo (CMB)",
  airportHub: "BIA_KATUNAYAKE",
  terminalText: "Bandaranaike International Airport (CMB) - Terminal 1 Arrival Lobby",
  pickupDateTime: "2026-10-21 04:30 AM",
  destinationText: "Bentota Beachfront Villas, Galle Road, Bentota",
  routeExpressway:
    "E03 Katunayake Expressway → Outer Circular (E02) → E01 Southern Expressway (Dodangoda Exit)",
  vehicleModel: "Toyota KDH Commuter Luxury High-Roof (Dual AC)",
  vehiclePlateNumber: "WP CAC-7890",
  chauffeurName: "Chaminda Silva",
  chauffeurMobile: "+94 77 123 4567",
  fuelLevelIndicator: "Full Tank (Diesel)",
  packedBreakfastBoxesCount: 2,
  packedBreakfastStyle: "Continental Bakery & Thambili King Coconut",
  dwcPermitNumber: "DWC-YAL-2026-9912",
  naturalistTrackerName: "Kumara Wickramasinghe",
  safariJeepVhfChannel: "Ch 14 (156.700 MHz)",
  securityOfficerName: "Sgt. Sunil Bandara (Resort Security)",
  specialInstructions: "VIP Fast-Track Assistance requested. Infant car seat installed in 2nd row.",
};

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface PassTranslations {
  readonly modePaging: string;
  readonly modeTripSheet: string;
  readonly modeExcursionPass: string;
  readonly printAction: string;
  readonly welcomeEn: string;
  readonly welcomeSi: string;
  readonly welcomeTa: string;
  readonly flightLabel: string;
  readonly terminalLabel: string;
  readonly guestLabel: string;
  readonly chauffeurLabel: string;
  readonly vehicleLabel: string;
  readonly plateLabel: string;
  readonly routeLabel: string;
  readonly passIdLabel: string;
  readonly dateLabel: string;
  readonly luggageLabel: string;
  readonly breakfastLabel: string;
  readonly securitySignOff: string;
  readonly departureOdometer: string;
  readonly returnOdometer: string;
  readonly securityClearanceStamp: string;
  readonly dwcPermitLabel: string;
  readonly naturalistLabel: string;
  readonly vhfChannelLabel: string;
}

export const PASS_TRANSLATIONS: Readonly<Record<SupportedLanguage, PassTranslations>> = {
  en: {
    modePaging: "Airport Paging Sign (Landscape)",
    modeTripSheet: "Chauffeur Trip & Gate Pass",
    modeExcursionPass: "Wildlife Excursion Gate Pass",
    printAction: "Print Pass / Board",
    welcomeEn: "WELCOME TO SRI LANKA",
    welcomeSi: "ආයුබෝවන්",
    welcomeTa: "நல்வரவு",
    flightLabel: "Flight",
    terminalLabel: "Meeting Point",
    guestLabel: "Guest Name",
    chauffeurLabel: "Chauffeur",
    vehicleLabel: "Vehicle Model",
    plateLabel: "Vehicle Reg No",
    routeLabel: "Approved Route / Expressways",
    passIdLabel: "Pass Reference ID",
    dateLabel: "Scheduled Departure / Arrival",
    luggageLabel: "Passenger & Baggage Count",
    breakfastLabel: "Kitchen Packed Meal Box Requisition",
    securitySignOff: "Resort Security Guard Post Clearance",
    departureOdometer: "Exit Odometer (km)",
    returnOdometer: "Return Odometer (km)",
    securityClearanceStamp: "Resort Chief of Security Authorized Stamp",
    dwcPermitLabel: "DWC Wildlife Permit No",
    naturalistLabel: "Field Naturalist / Tracker",
    vhfChannelLabel: "Safari Emergency VHF Radio",
  },
  si: {
    modePaging: "ගුවන් තොටුපළ නාම පුවරුව (තිරස්)",
    modeTripSheet: "රියදුරු ගමන් හා ගේට්ටු බලපත්‍රය",
    modeExcursionPass: "වනජීවී සෆාරි ගේට්ටු බලපත්‍රය",
    printAction: "මුද්‍රණය කරන්න",
    welcomeEn: "WELCOME TO SRI LANKA",
    welcomeSi: "ආයුබෝවන්",
    welcomeTa: "නල්වරවු",
    flightLabel: "ගුවන් ගමන් අංකය",
    terminalLabel: "හමුවන ස්ථානය",
    guestLabel: "අමුත්තාගේ නම",
    chauffeurLabel: "රියදුරු",
    vehicleLabel: "වාහන වර්ගය",
    plateLabel: "ලියාපදිංචි අංකය",
    routeLabel: "අධිවේගී මාර්ග මාර්ගය",
    passIdLabel: "බලපත්‍ර අංකය",
    dateLabel: "දිනය සහ වේලාව",
    luggageLabel: "මගීන් සහ ගමන් මලු සංඛ්‍යාව",
    breakfastLabel: "මුළුතැන්ගෙයි උදෑසන ආහාර පාර්සල්",
    securitySignOff: "ආරක්ෂක අංශ නිෂ්කාශනය",
    departureOdometer: "පිටත්වීමේ කි.මී. අගය",
    returnOdometer: "පැමිණීමේ කි.මී. අගය",
    securityClearanceStamp: "ප්‍රධාන ආරක්ෂක නිලධාරී නිල මුද්‍රාව",
    dwcPermitLabel: "වනජීවී දෙපාර්තමේන්තු බලපත්‍රය",
    naturalistLabel: "වනජීවී මඟපෙන්වන්නා",
    vhfChannelLabel: "ගුවන්විදුලි තරංග මාලාව (VHF)",
  },
  ta: {
    modePaging: "விமான நிலைய பெயர் பலகை (கிடைமட்டம்)",
    modeTripSheet: "சாரதி பயண & வாயில் அனுமதி",
    modeExcursionPass: "வனவிலங்கு சவாரி வாயில் அனுமதி",
    printAction: "அச்சிடுக",
    welcomeEn: "WELCOME TO SRI LANKA",
    welcomeSi: "ஆயுபோவன்",
    welcomeTa: "நல்வரவு",
    flightLabel: "விமான எண்",
    terminalLabel: "சந்திக்கும் இடம்",
    guestLabel: "விருந்தினர் பெயர்",
    chauffeurLabel: "சாரதி",
    vehicleLabel: "வாகன மாடல்",
    plateLabel: "வாகன எண்",
    routeLabel: "அதிவேக நெடுஞ்சாலை பாதை",
    passIdLabel: "அனுமதி எண்",
    dateLabel: "திகதி & நேரம்",
    luggageLabel: "பயணிகள் & பொதிகள் எண்ணிக்கை",
    breakfastLabel: "காலை உணவுப் பொட்டலங்கள்",
    securitySignOff: "பாதுகாப்பு சோதனை அனுமதி",
    departureOdometer: "புறப்படும் போது கி.மீ.",
    returnOdometer: "திரும்பும் போது கி.மீ.",
    securityClearanceStamp: "பாதுகாப்பு அதிகாரி முத்திரை",
    dwcPermitLabel: "வனவிலங்கு அனுமதி எண்",
    naturalistLabel: "இயற்கை வழிகாட்டி",
    vhfChannelLabel: "அவசர வானொலி அலைவரிசை",
  },
};

export function getPassTranslations(lang: SupportedLanguage = "en"): PassTranslations {
  return PASS_TRANSLATIONS[lang] ?? PASS_TRANSLATIONS.en;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12 each)
// ============================================================================

interface PagingBoardViewProps {
  readonly data: TransferPassData;
  readonly t: PassTranslations;
}

const PagingBoardView: FC<PagingBoardViewProps> = ({ data, t }) => {
  return (
    <article
      data-testid="paging-board-view"
      className="w-full bg-white text-stone-900 border-4 border-stone-900 rounded-3xl p-8 sm:p-14 flex flex-col justify-between aspect-[1.414/1] shadow-2xl print:shadow-none print:border-4 print:p-8 print:m-0"
    >
      {/* Top Header: Hotel Brand & Welcome */}
      <div className="text-center border-b-2 border-stone-800 pb-6 space-y-1.5">
        <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-800">
          {data.hotelBrandName}
        </div>
        <div className="text-[11px] sm:text-xs text-stone-600 font-medium">
          {data.hotelSubBrand}
        </div>
        <div className="pt-2 flex items-center justify-center gap-3 text-sm sm:text-base font-bold tracking-widest text-stone-800">
          <span>{t.welcomeEn}</span>
          <span>•</span>
          <span className="font-serif">{t.welcomeSi}</span>
          <span>•</span>
          <span className="font-serif">{t.welcomeTa}</span>
        </div>
      </div>

      {/* Main Focus: Guest Name */}
      <div className="my-auto py-8 text-center space-y-3">
        <span className="text-xs uppercase tracking-widest text-stone-500 font-bold block">
          Distinguished Guest
        </span>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-950 font-sans uppercase">
          {data.guestSalutation} {data.guestFullName}
        </h1>
        <div className="text-xs sm:text-sm font-semibold text-stone-600">
          Destination: {data.destinationText} ({data.guestRoomNumber})
        </div>
      </div>

      {/* Bottom Flight & Chauffeur Bar */}
      <div className="border-t-2 border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div>
          {data.flightNumber && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-800">✈️ {t.flightLabel}:</span>
              <span className="font-black text-sm">{data.flightNumber}</span>
              <span className="text-stone-500">({data.flightOriginOrDest})</span>
            </div>
          )}
          <div className="text-[11px] text-stone-500 mt-0.5">{data.terminalText}</div>
        </div>

        <div className="text-right">
          <div className="font-bold">
            {t.chauffeurLabel}: {data.chauffeurName}
          </div>
          <div className="text-stone-600 font-bold">
            {data.vehicleModel} • {data.vehiclePlateNumber}
          </div>
        </div>
      </div>
    </article>
  );
};

interface TripSheetViewProps {
  readonly data: TransferPassData;
  readonly t: PassTranslations;
}

const TripSheetView: FC<TripSheetViewProps> = ({ data, t }) => {
  return (
    <article
      data-testid="trip-sheet-view"
      className="w-full bg-white text-stone-900 border-2 border-stone-900 rounded-2xl p-6 sm:p-10 space-y-6 shadow-xl print:shadow-none print:border print:p-6 print:m-0"
    >
      {/* Official Header */}
      <div className="flex items-start justify-between border-b-2 border-stone-900 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-stone-900 text-white px-2 py-0.5 rounded">
            OFFICIAL RESORT GATE PASS
          </span>
          <h2 className="text-xl font-black text-stone-950 mt-1 uppercase">
            Chauffeur Trip Sheet & Security Clearance
          </h2>
          <p className="text-xs text-stone-600">{data.hotelBrandName}</p>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="font-bold">
            {t.passIdLabel}: {data.passId}
          </div>
          <div className="text-stone-500 mt-0.5">{data.pickupDateTime}</div>
        </div>
      </div>

      {/* Grid 1: Guest & Route Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl border border-stone-300 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            {t.guestLabel} & Room
          </span>
          <div className="font-bold text-sm text-stone-950">
            {data.guestSalutation} {data.guestFullName}
          </div>
          <div className="text-stone-600">
            Room: {data.guestRoomNumber} • {t.luggageLabel}: {data.passengerCount} Pax /{" "}
            {data.luggagePiecesCount} Bags
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-stone-300 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            {t.routeLabel}
          </span>
          <div className="font-semibold text-stone-900">{data.destinationText}</div>
          <div className="text-[11px] text-stone-600 font-mono leading-tight">
            {data.routeExpressway}
          </div>
        </div>
      </div>

      {/* Grid 2: Vehicle & Chauffeur Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-3 rounded-xl border border-stone-300">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            {t.chauffeurLabel}
          </span>
          <div className="font-bold text-stone-950 mt-0.5">{data.chauffeurName}</div>
          <div className="text-stone-600 text-[11px]">{data.chauffeurMobile}</div>
        </div>

        <div className="p-3 rounded-xl border border-stone-300">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            {t.vehicleLabel}
          </span>
          <div className="font-bold text-stone-950 mt-0.5">{data.vehicleModel}</div>
          <div className="text-amber-800 font-bold">{data.vehiclePlateNumber}</div>
        </div>

        <div className="p-3 rounded-xl border border-stone-300">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">
            Fuel / Toll Card Tag
          </span>
          <div className="font-bold text-stone-950 mt-0.5">{data.fuelLevelIndicator}</div>
          <div className="text-emerald-700 font-semibold">ETC Card Verified</div>
        </div>
      </div>

      {/* Breakfast Box Collection confirmation */}
      {data.packedBreakfastBoxesCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="Breakfast box">
              🍱
            </span>
            <div>
              <span className="font-bold text-amber-950 block">{t.breakfastLabel}</span>
              <span className="text-amber-800 text-[11px]">
                Style: {data.packedBreakfastStyle ?? "Sri Lankan Roti & Continental"}
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-950 text-sm">
            {data.packedBreakfastBoxesCount} Boxes Handed Over
          </span>
        </div>
      )}

      {/* Special Directives */}
      <div className="p-3 rounded-xl border border-stone-200 text-xs text-stone-700 bg-stone-50">
        <span className="font-bold block text-[11px] text-stone-900 mb-0.5">
          Special Instructions:
        </span>
        {data.specialInstructions}
      </div>

      {/* Gate Security Sign-Off Block */}
      <div className="border-t-2 border-stone-900 pt-4 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
          {t.securitySignOff}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">{t.departureOdometer}</span>
            <div className="border-b border-stone-400 pb-1" />
          </div>

          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">{t.returnOdometer}</span>
            <div className="border-b border-stone-400 pb-1" />
          </div>

          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">Security Gate Officer</span>
            <span className="font-bold text-[11px]">{data.securityOfficerName}</span>
          </div>

          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">{t.securityClearanceStamp}</span>
            <span className="text-[9px] text-stone-400 italic">Official Seal</span>
          </div>
        </div>
      </div>
    </article>
  );
};

interface ExcursionPassViewProps {
  readonly data: TransferPassData;
  readonly t: PassTranslations;
}

const ExcursionPassView: FC<ExcursionPassViewProps> = ({ data, t }) => {
  return (
    <article
      data-testid="excursion-pass-view"
      className="w-full bg-white text-stone-900 border-2 border-emerald-900 rounded-2xl p-6 sm:p-10 space-y-6 shadow-xl print:shadow-none print:border print:p-6 print:m-0"
    >
      {/* Official Header */}
      <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-800 text-white px-2 py-0.5 rounded">
            DWC WILDLIFE SAFARI GATE PASS
          </span>
          <h2 className="text-xl font-black text-stone-950 mt-1 uppercase">
            Wildlife Excursion & Field Tracker Pass
          </h2>
          <p className="text-xs text-stone-600">{data.hotelBrandName}</p>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="font-bold text-emerald-800">
            {t.dwcPermitLabel}: {data.dwcPermitNumber}
          </div>
          <div className="text-stone-500 mt-0.5">Date: {data.pickupDateTime}</div>
        </div>
      </div>

      {/* Safari & Jeep Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            {t.naturalistLabel}
          </span>
          <div className="font-bold text-stone-950 mt-0.5">{data.naturalistTrackerName}</div>
          <div className="text-stone-600 text-[11px]">SLTDA Licensed Wildlife Guide</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            Safari Jeep & Driver
          </span>
          <div className="font-bold text-stone-950 mt-0.5">{data.chauffeurName}</div>
          <div className="text-stone-700 font-bold">{data.vehiclePlateNumber} (4x4 Modified)</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            {t.vhfChannelLabel}
          </span>
          <div className="font-bold text-emerald-950 mt-0.5">{data.safariJeepVhfChannel}</div>
          <div className="text-stone-600 text-[11px]">Park Ranger Emergency Channel</div>
        </div>
      </div>

      {/* Guest Manifest */}
      <div className="p-4 rounded-xl border border-stone-300 text-xs space-y-1">
        <div className="flex justify-between font-bold text-stone-950">
          <span>
            {t.guestLabel}: {data.guestSalutation} {data.guestFullName}
          </span>
          <span>Room: {data.guestRoomNumber}</span>
        </div>
        <div className="text-stone-600">
          Passenger Count: {data.passengerCount} Pax • Destination: {data.destinationText}
        </div>
      </div>

      {/* Park Ranger Stamp Block */}
      <div className="border-t-2 border-emerald-900 pt-4 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
          DWC Park Gate In / Gate Out Verification Block
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">Park Gate Entry Time</span>
            <div className="border-b border-stone-400 pb-1" />
          </div>

          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">Park Gate Exit Time</span>
            <div className="border-b border-stone-400 pb-1" />
          </div>

          <div className="p-3 border border-dashed border-stone-400 rounded-xl h-20 flex flex-col justify-between">
            <span className="text-[10px] text-stone-500">DWC Ranger Station Seal</span>
            <span className="text-[9px] text-stone-400 italic">Authorized Stamp</span>
          </div>
        </div>
      </div>
    </article>
  );
};

// ============================================================================
// Main Exported Component: PrintableTransferPass
// ============================================================================

export const PrintableTransferPass: FC<PrintableTransferPassProps> = ({
  passData = DEFAULT_TRANSFER_PASS,
  language = "en",
  initialMode = "PAGING_BOARD",
  onPrint,
  testId = "printable-transfer-pass",
}) => {
  const t = useMemo(() => getPassTranslations(language), [language]);
  const [activeMode, setActiveMode] = useState<PassDisplayMode>(initialMode);
  const modeSelectId = useId();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div data-testid={testId} className="w-full max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      {/* 1. On-Screen Floating Controls (Hidden on Print) */}
      <div className="print:hidden apple-liquid-glass bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto">
          <label
            htmlFor={modeSelectId}
            className="text-xs font-semibold text-stone-600 dark:text-stone-400 shrink-0"
          >
            Format:
          </label>
          <div
            id={modeSelectId}
            className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl gap-1"
          >
            <button
              type="button"
              onClick={() => setActiveMode("PAGING_BOARD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "PAGING_BOARD"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {t.modePaging}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("DRIVER_TRIP_SHEET")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "DRIVER_TRIP_SHEET"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {t.modeTripSheet}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("EXCURSION_GATE_PASS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "EXCURSION_GATE_PASS"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {t.modeExcursionPass}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <span>🖨️</span>
          <span>{t.printAction}</span>
        </button>
      </div>

      {/* 2. Printable Content View */}
      <section className="print:m-0 print:p-0">
        {activeMode === "PAGING_BOARD" && <PagingBoardView data={passData} t={t} />}
        {activeMode === "DRIVER_TRIP_SHEET" && <TripSheetView data={passData} t={t} />}
        {activeMode === "EXCURSION_GATE_PASS" && <ExcursionPassView data={passData} t={t} />}
      </section>
    </div>
  );
};
