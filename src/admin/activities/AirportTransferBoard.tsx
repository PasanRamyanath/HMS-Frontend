/**
 * BIA Katunayake / Mattala Airport Transfer & Flight Tracker Board
 * (HMS-Frontend/src/admin/activities/AirportTransferBoard.tsx)
 *
 * Implements Step 356:
 * - Real-time tracking of airport arrivals (CMB/HRI) & departures.
 * - Flight tracking details (UL 504, EK 650, QR 668), ETA/ETD, and flight statuses.
 * - Chauffeur assignment, vehicle plates, paging board names, and expressway toll toggles.
 * - 1-Click SMS dispatch generator via SMSGo.lk gateway.
 * - 1-Click Room Folio posting with Sri Lankan statutory taxes.
 * - Trilingual localization (en, si, ta) and Apple HIG Liquid Glass styling.
 */

import { type FC, useId, useMemo, useState } from "react";

// ============================================================================
// Types & Contracts
// ============================================================================

export type TransferDirection = "ARRIVAL" | "DEPARTURE";

export type AirportHub = "BIA_KATUNAYAKE" | "HRI_MATTALA" | "RML_RATMALANA";

export type FlightStatus =
  | "SCHEDULED"
  | "ON_TIME"
  | "DELAYED"
  | "LANDED"
  | "DEPARTED"
  | "CANCELLED";

export type TransferOperationalStatus =
  | "PENDING_DISPATCH"
  | "CHAUFFEUR_DISPATCHED"
  | "PAGING_AT_LOBBY"
  | "GUEST_ONBOARD"
  | "COMPLETED"
  | "CANCELLED";

export type TransferVehicleType =
  | "SEDAN_PREMIUM"
  | "KDH_FLAT_ROOF"
  | "KDH_HIGH_ROOF"
  | "COASTER_MINI_BUS";

export interface AirportTransferRecord {
  readonly id: string;
  readonly direction: TransferDirection;
  readonly airportHub: AirportHub;
  readonly reservationId: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly guestContactMobile: string;
  readonly pagingBoardName: string;
  readonly flightNumber: string;
  readonly flightAirline: string;
  readonly scheduledTime: string; // HH:mm
  readonly estimatedTime: string; // HH:mm (live ETA/ETD)
  readonly flightStatus: FlightStatus;
  readonly passengersCount: number;
  readonly luggageCount: number;
  readonly vehicleType: TransferVehicleType;
  readonly vehiclePlate: string;
  readonly chauffeurName: string;
  readonly chauffeurMobile: string;
  readonly transferPriceLkr: number;
  readonly includesExpresswayToll: boolean;
  readonly operationalStatus: TransferOperationalStatus;
  readonly isFolioPosted: boolean;
  readonly smsDispatchCount: number;
  readonly lastSmsSentAt?: string | undefined;
}

export interface AirportTransferSummaryKpis {
  readonly totalTransfers: number;
  readonly totalArrivals: number;
  readonly totalDepartures: number;
  readonly activeDispatches: number;
  readonly unpostedFolioRevenueLkr: number;
  readonly totalRevenueLkr: number;
}

export interface SmsDispatchMessage {
  readonly recipientMobile: string;
  readonly messageText: string;
  readonly transferId: string;
}

export interface AirportTransferTranslations {
  readonly boardTitle: string;
  readonly boardSubtitle: string;
  readonly tabAll: string;
  readonly tabArrivals: string;
  readonly tabDepartures: string;
  readonly kpiTotal: string;
  readonly kpiArrivals: string;
  readonly kpiDepartures: string;
  readonly kpiActiveDispatches: string;
  readonly kpiUnpostedRevenue: string;
  readonly searchPlaceholder: string;
  readonly flightHeader: string;
  readonly guestHeader: string;
  readonly chauffeurHeader: string;
  readonly vehicleHeader: string;
  readonly routeHeader: string;
  readonly statusHeader: string;
  readonly actionsHeader: string;
  readonly sendSmsBtn: string;
  readonly postFolioBtn: string;
  readonly folioPostedBadge: string;
  readonly emptyTransfersMsg: string;
  readonly smsModalTitle: string;
  readonly smsRecipientLabel: string;
  readonly smsContentLabel: string;
  readonly confirmSmsBtn: string;
  readonly cancelBtn: string;
  readonly closeBtn: string;
}

export interface AirportTransferBoardProps {
  readonly transfers?: readonly AirportTransferRecord[] | undefined;
  readonly hotelPropertyName?: string | undefined;
  readonly lang?: "en" | "si" | "ta" | undefined;
  readonly onSendSms?: ((dispatch: SmsDispatchMessage) => void) | undefined;
  readonly onPostToFolio?: ((transfer: AirportTransferRecord) => void) | undefined;
  readonly onStatusChange?:
    | ((transferId: string, nextStatus: TransferOperationalStatus) => void)
    | undefined;
}

// ============================================================================
// Sample Seed Data & Default Constants
// ============================================================================

export const DEFAULT_AIRPORT_TRANSFERS: readonly AirportTransferRecord[] = [
  {
    id: "TRF-2026-001",
    direction: "ARRIVAL",
    airportHub: "BIA_KATUNAYAKE",
    reservationId: "RES-8891",
    roomNumber: "Ocean Villa 12",
    guestName: "Lady Victoria Spencer",
    guestContactMobile: "+44 7911 123456",
    pagingBoardName: "LADY VICTORIA SPENCER",
    flightNumber: "UL 504",
    flightAirline: "SriLankan Airlines (London Heathrow)",
    scheduledTime: "12:45",
    estimatedTime: "12:50",
    flightStatus: "LANDED",
    passengersCount: 2,
    luggageCount: 4,
    vehicleType: "SEDAN_PREMIUM",
    vehiclePlate: "WP CAC-9812",
    chauffeurName: "Dhammika Silva",
    chauffeurMobile: "+94 77 889 9001",
    transferPriceLkr: 26000,
    includesExpresswayToll: true,
    operationalStatus: "PAGING_AT_LOBBY",
    isFolioPosted: false,
    smsDispatchCount: 1,
    lastSmsSentAt: "2026-10-20T12:30:00Z",
  },
  {
    id: "TRF-2026-002",
    direction: "ARRIVAL",
    airportHub: "BIA_KATUNAYAKE",
    reservationId: "RES-8895",
    roomNumber: "Deluxe Suite 304",
    guestName: "Herr Wolfgang Weber",
    guestContactMobile: "+49 170 555 1234",
    pagingBoardName: "HERR WOLFGANG WEBER",
    flightNumber: "EK 650",
    flightAirline: "Emirates (Dubai International)",
    scheduledTime: "14:10",
    estimatedTime: "14:10",
    flightStatus: "ON_TIME",
    passengersCount: 3,
    luggageCount: 5,
    vehicleType: "KDH_FLAT_ROOF",
    vehiclePlate: "WP ND-4521",
    chauffeurName: "Kusal Perera",
    chauffeurMobile: "+94 71 223 3445",
    transferPriceLkr: 32000,
    includesExpresswayToll: true,
    operationalStatus: "CHAUFFEUR_DISPATCHED",
    isFolioPosted: false,
    smsDispatchCount: 0,
  },
  {
    id: "TRF-2026-003",
    direction: "DEPARTURE",
    airportHub: "BIA_KATUNAYAKE",
    reservationId: "RES-8820",
    roomNumber: "Room 208",
    guestName: "Mr. Jean-Luc Picard",
    guestContactMobile: "+33 612 345678",
    pagingBoardName: "MR. J.L. PICARD",
    flightNumber: "QR 668",
    flightAirline: "Qatar Airways (Doha Hamad)",
    scheduledTime: "18:30",
    estimatedTime: "18:30",
    flightStatus: "SCHEDULED",
    passengersCount: 1,
    luggageCount: 2,
    vehicleType: "SEDAN_PREMIUM",
    vehiclePlate: "WP CBA-1122",
    chauffeurName: "Sarath Wickrama",
    chauffeurMobile: "+94 76 554 4332",
    transferPriceLkr: 24000,
    includesExpresswayToll: true,
    operationalStatus: "PENDING_DISPATCH",
    isFolioPosted: true,
    smsDispatchCount: 0,
  },
  {
    id: "TRF-2026-004",
    direction: "ARRIVAL",
    airportHub: "HRI_MATTALA",
    reservationId: "RES-8902",
    roomNumber: "Pool Cabana 04",
    guestName: "Dr. Alexander Rostov",
    guestContactMobile: "+7 903 123 4567",
    pagingBoardName: "DR. ROSTOV & FAMILY",
    flightNumber: "FZ 551",
    flightAirline: "flydubai (Dubai / Mattala Direct)",
    scheduledTime: "16:20",
    estimatedTime: "16:45",
    flightStatus: "DELAYED",
    passengersCount: 5,
    luggageCount: 8,
    vehicleType: "KDH_HIGH_ROOF",
    vehiclePlate: "SP NA-7890",
    chauffeurName: "Priyantha Jayasuriya",
    chauffeurMobile: "+94 77 334 5566",
    transferPriceLkr: 38000,
    includesExpresswayToll: false,
    operationalStatus: "CHAUFFEUR_DISPATCHED",
    isFolioPosted: false,
    smsDispatchCount: 1,
  },
  {
    id: "TRF-2026-005",
    direction: "DEPARTURE",
    airportHub: "BIA_KATUNAYAKE",
    reservationId: "RES-8833",
    roomNumber: "Heritage Suite 101",
    guestName: "Mme. Marie Antoinette",
    guestContactMobile: "+33 689 443322",
    pagingBoardName: "MME. ANTOINETTE",
    flightNumber: "SQ 468",
    flightAirline: "Singapore Airlines (Singapore Changi)",
    scheduledTime: "22:15",
    estimatedTime: "22:15",
    flightStatus: "SCHEDULED",
    passengersCount: 2,
    luggageCount: 4,
    vehicleType: "SEDAN_PREMIUM",
    vehiclePlate: "WP CAC-9812",
    chauffeurName: "Dhammika Silva",
    chauffeurMobile: "+94 77 889 9001",
    transferPriceLkr: 26000,
    includesExpresswayToll: true,
    operationalStatus: "PENDING_DISPATCH",
    isFolioPosted: false,
    smsDispatchCount: 0,
  },
];

export const AIRPORT_TRANSLATIONS: Record<"en" | "si" | "ta", AirportTransferTranslations> = {
  en: {
    boardTitle: "Airport Transfer & Flight Tracker Board",
    boardSubtitle:
      "BIA Katunayake & Mattala Rajapaksa arrival/departure chauffeurs, live flight statuses & 1-click SMS dispatch.",
    tabAll: "All Transfers",
    tabArrivals: "Airport Pickups (Arrivals)",
    tabDepartures: "Airport Drop-offs (Departures)",
    kpiTotal: "Total Transfers",
    kpiArrivals: "Arrivals",
    kpiDepartures: "Departures",
    kpiActiveDispatches: "Active Dispatches",
    kpiUnpostedRevenue: "Unposted Folios",
    searchPlaceholder: "Search by guest name, flight (UL 504), room or driver...",
    flightHeader: "Flight & Airport",
    guestHeader: "Guest & Paging Board",
    chauffeurHeader: "Chauffeur & Mobile",
    vehicleHeader: "Vehicle & Capacity",
    routeHeader: "Destination & Toll",
    statusHeader: "Flight / Dispatch Status",
    actionsHeader: "Operations",
    sendSmsBtn: "Dispatch SMS",
    postFolioBtn: "Post to Folio",
    folioPostedBadge: "Posted to Folio",
    emptyTransfersMsg: "No airport transfer schedules match your filters.",
    smsModalTitle: "1-Click Chauffeur Dispatch SMS (SMSGo.lk)",
    smsRecipientLabel: "Guest Mobile Number",
    smsContentLabel: "Dispatch SMS Message Preview",
    confirmSmsBtn: "Send SMS via SMSGo.lk",
    cancelBtn: "Cancel",
    closeBtn: "Close",
  },
  si: {
    boardTitle: "ගුවන් තොටුපළ ප්‍රවාහන සහ ගුවන් ගමන් පුවරුව",
    boardSubtitle: "කටුනායක සහ මත්තල ගුවන් තොටුපළ මගී ප්‍රවාහන, සජීවී ගුවන් ගමන් තොරතුරු සහ SMS පණිවිඩ පද්ධතිය.",
    tabAll: "සියලු ප්‍රවාහන",
    tabArrivals: "පැමිණීම් (Arrivals)",
    tabDepartures: "පිටත්වීම් (Departures)",
    kpiTotal: "මුළු ප්‍රවාහන",
    kpiArrivals: "පැමිණීම්",
    kpiDepartures: "පිටත්වීම්",
    kpiActiveDispatches: "ක්‍රියාකාරී රියදුරන්",
    kpiUnpostedRevenue: "බිල්පත් නොකළ ආදායම",
    searchPlaceholder: "අමුත්තාගේ නම, ගුවන් ගමන් අංකය (UL 504) හෝ කාමරයෙන් සොයන්න...",
    flightHeader: "ගුවන් ගමන සහ තොටුපළ",
    guestHeader: "අමුත්තා සහ නාම පුවරුව",
    chauffeurHeader: "රියදුරු සහ දුරකථනය",
    vehicleHeader: "වාහනය සහ ධාරිතාව",
    routeHeader: "ගමනාන්තය සහ අධිවේගී ගාස්තු",
    statusHeader: "තත්ත්වය",
    actionsHeader: "මෙහෙයුම්",
    sendSmsBtn: "SMS යවන්න",
    postFolioBtn: "Folio එකතු කරන්න",
    folioPostedBadge: "Folio එකතු කර ඇත",
    emptyTransfersMsg: "කිසිදු ප්‍රවාහන සටහනක් හමු නොවීය.",
    smsModalTitle: "රියදුරු තොරතුරු SMS පණිවිඩය (SMSGo.lk)",
    smsRecipientLabel: "අමුත්තාගේ දුරකථන අංකය",
    smsContentLabel: "පණිවිඩයේ පෙරදසුන",
    confirmSmsBtn: "SMSGo.lk හරහා යවන්න",
    cancelBtn: "අවලංගු කරන්න",
    closeBtn: "වසන්න",
  },
  ta: {
    boardTitle: "விமான நிலைய பரிமாற்றம் மற்றும் விமான கண்காணிப்பு",
    boardSubtitle:
      "கட்டுநாயக்க மற்றும் மத்தள விமான நிலைய வருகை/புறப்பாடு, நேரடி விமான நிலை மற்றும் SMS அனுப்புதல்.",
    tabAll: "அனைத்து பரிமாற்றங்கள்",
    tabArrivals: "வருகைகள் (Pickups)",
    tabDepartures: "புறப்பாடுகள் (Drop-offs)",
    kpiTotal: "மொத்த பரிமாற்றங்கள்",
    kpiArrivals: "வருகைகள்",
    kpiDepartures: "புறப்பாடுகள்",
    kpiActiveDispatches: "செயலில் உள்ள வாகனங்கள்",
    kpiUnpostedRevenue: "பதிவு செய்யப்படாத வருவாய்",
    searchPlaceholder: "விருந்தினர் பெயர், விமான எண் அல்லது அறை மூலம் தேடுக...",
    flightHeader: "விமானம் மற்றும் நிலையம்",
    guestHeader: "விருந்தினர் மற்றும் பெயர் பலகை",
    chauffeurHeader: "சாரதி மற்றும் தொலைபேசி",
    vehicleHeader: "வாகனம் மற்றும் கொள்ளளவு",
    routeHeader: "இலக்கு மற்றும் நெடுஞ்சாலை கட்டணம்",
    statusHeader: "நிலை",
    actionsHeader: "செயல்கள்",
    sendSmsBtn: "SMS அனுப்புக",
    postFolioBtn: "Folio இல் சேர்க்க",
    folioPostedBadge: "Folio இல் சேர்க்கப்பட்டது",
    emptyTransfersMsg: "பரிமாற்றப் பதிவுகள் எதுவும் இல்லை.",
    smsModalTitle: "சாரதி விவர SMS (SMSGo.lk)",
    smsRecipientLabel: "விருந்தினர் தொலைபேசி எண்",
    smsContentLabel: "SMS செய்தி முன்னோட்டம்",
    confirmSmsBtn: "SMSGo.lk மூலம் அனுப்புக",
    cancelBtn: "ரத்து செய்",
    closeBtn: "மூடு",
  },
};

// ============================================================================
// Pure Calculation & Formatting Helpers
// ============================================================================

export function calculateTransferSummary(
  transfers: readonly AirportTransferRecord[],
): AirportTransferSummaryKpis {
  let totalArrivals = 0;
  let totalDepartures = 0;
  let activeDispatches = 0;
  let unpostedFolioRevenueLkr = 0;
  let totalRevenueLkr = 0;

  for (const t of transfers) {
    if (t.direction === "ARRIVAL") totalArrivals += 1;
    if (t.direction === "DEPARTURE") totalDepartures += 1;
    if (
      t.operationalStatus === "CHAUFFEUR_DISPATCHED" ||
      t.operationalStatus === "PAGING_AT_LOBBY" ||
      t.operationalStatus === "GUEST_ONBOARD"
    ) {
      activeDispatches += 1;
    }
    if (!t.isFolioPosted) {
      unpostedFolioRevenueLkr += t.transferPriceLkr;
    }
    totalRevenueLkr += t.transferPriceLkr;
  }

  return {
    totalTransfers: transfers.length,
    totalArrivals,
    totalDepartures,
    activeDispatches,
    unpostedFolioRevenueLkr,
    totalRevenueLkr,
  };
}

export function generateDispatchSmsText(
  record: AirportTransferRecord,
  hotelPropertyName = "Amaya Resort & Spa",
): string {
  const airportName =
    record.airportHub === "BIA_KATUNAYAKE"
      ? "BIA Katunayake Arrival Lobby"
      : record.airportHub === "HRI_MATTALA"
        ? "Mattala Rajapaksa Airport Arrival Concourse"
        : "Ratmalana Airport Terminal";

  if (record.direction === "ARRIVAL") {
    return `Ayubowan ${record.guestName}! Your private chauffeur ${record.chauffeurName} (Vehicle: ${record.vehiclePlate}) is waiting for you at ${airportName} holding paging board '${record.pagingBoardName}'. Driver direct: ${record.chauffeurMobile}. Welcome to ${hotelPropertyName}, Sri Lanka!`;
  }

  return `Dear ${record.guestName}, your airport departure transfer to ${airportName} is scheduled with chauffeur ${record.chauffeurName} (${record.vehiclePlate}) at ${record.scheduledTime}. Driver direct: ${record.chauffeurMobile}. We wish you a pleasant journey from ${hotelPropertyName}!`;
}

export function getFlightStatusBadgeStyle(status: FlightStatus): string {
  switch (status) {
    case "LANDED":
    case "DEPARTED":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "ON_TIME":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    case "DELAYED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "CANCELLED":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

export function getOperationalStatusBadgeStyle(status: TransferOperationalStatus): string {
  switch (status) {
    case "PAGING_AT_LOBBY":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 animate-pulse";
    case "GUEST_ONBOARD":
    case "CHAUFFEUR_DISPATCHED":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "CANCELLED":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    default:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }
}

export function getNextOperationalStatus(
  current: TransferOperationalStatus,
): TransferOperationalStatus {
  switch (current) {
    case "PENDING_DISPATCH":
      return "CHAUFFEUR_DISPATCHED";
    case "CHAUFFEUR_DISPATCHED":
      return "PAGING_AT_LOBBY";
    case "PAGING_AT_LOBBY":
      return "GUEST_ONBOARD";
    case "GUEST_ONBOARD":
      return "COMPLETED";
    default:
      return "COMPLETED";
  }
}

export function filterTransfers(
  transfers: readonly AirportTransferRecord[],
  filterDirection: "ALL" | "ARRIVAL" | "DEPARTURE",
  searchQuery: string,
): readonly AirportTransferRecord[] {
  const query = searchQuery.trim().toLowerCase();

  return transfers.filter((t) => {
    if (filterDirection !== "ALL" && t.direction !== filterDirection) {
      return false;
    }
    if (!query) return true;

    return (
      t.guestName.toLowerCase().includes(query) ||
      t.flightNumber.toLowerCase().includes(query) ||
      t.roomNumber.toLowerCase().includes(query) ||
      t.chauffeurName.toLowerCase().includes(query) ||
      t.vehiclePlate.toLowerCase().includes(query) ||
      t.pagingBoardName.toLowerCase().includes(query)
    );
  });
}

// ============================================================================
// Main Component: AirportTransferBoard
// ============================================================================

interface TransferCardProps {
  readonly record: AirportTransferRecord;
  readonly t: AirportTransferTranslations;
  readonly onOpenSms: (record: AirportTransferRecord) => void;
  readonly onPostToFolio?: ((transfer: AirportTransferRecord) => void) | undefined;
  readonly onStatusChange?:
    | ((transferId: string, nextStatus: TransferOperationalStatus) => void)
    | undefined;
}

const TransferCard: FC<TransferCardProps> = ({
  record,
  t,
  onOpenSms,
  onPostToFolio,
  onStatusChange,
}) => {
  const flightBadge = getFlightStatusBadgeStyle(record.flightStatus);
  const opBadge = getOperationalStatusBadgeStyle(record.operationalStatus);

  return (
    <div className="p-5 rounded-3xl apple-liquid-glass bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 shadow-md space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
      {/* Top Bar: Direction Pill, Flight No & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                record.direction === "ARRIVAL"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300"
                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300"
              }`}
            >
              {record.direction === "ARRIVAL" ? "🛬 ARRIVAL" : "🛫 DEPARTURE"}
            </span>
            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
              {record.flightNumber}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{record.flightAirline}</p>
        </div>

        <div className="text-right">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${flightBadge}`}
          >
            {record.flightStatus}
          </span>
          <p className="font-mono text-xs font-extrabold tabular-nums-lkr text-slate-900 dark:text-white mt-1">
            ETA: {record.estimatedTime}
          </p>
        </div>
      </div>

      {/* Guest & Paging Board Info */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{record.guestName}</h3>
          <span className="text-xs font-semibold text-slate-500">{record.roomNumber}</span>
        </div>
        <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">
              Paging Board Name:
            </span>
            <span className="text-xs font-extrabold tracking-wide text-slate-800 dark:text-slate-200">
              "{record.pagingBoardName}"
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            👥 {record.passengersCount}p • 🧳 {record.luggageCount}b
          </span>
        </div>
      </div>

      {/* Chauffeur & Vehicle Allocation */}
      <div className="text-[11px] space-y-1 bg-black/[0.015] dark:bg-white/[0.015] p-2.5 rounded-xl border border-black/5 dark:border-white/5">
        <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
          <span className="font-bold flex items-center gap-1">
            <span>👤</span> {record.chauffeurName}
          </span>
          <span className="font-mono text-slate-500">{record.chauffeurMobile}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span className="font-medium">{record.vehiclePlate}</span>
          <span className="uppercase">{record.vehicleType.replace(/_/g, " ")}</span>
        </div>
        {record.includesExpresswayToll && (
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
            <span>✓</span> Includes Expressway Toll (E01 / E03)
          </div>
        )}
      </div>

      {/* Operational Status & Price Ribbon */}
      <div className="flex items-center justify-between pt-1">
        {onStatusChange ? (
          <button
            type="button"
            onClick={() =>
              onStatusChange(record.id, getNextOperationalStatus(record.operationalStatus))
            }
            title="Advance transfer operational status"
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${opBadge}`}
          >
            {record.operationalStatus.replace(/_/g, " ")} ↻
          </button>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${opBadge}`}
          >
            {record.operationalStatus.replace(/_/g, " ")}
          </span>
        )}
        <span className="font-mono text-sm font-black tabular-nums-lkr text-slate-900 dark:text-white">
          {record.transferPriceLkr.toLocaleString()} LKR
        </span>
      </div>

      {/* Actions: 1-Click SMS Dispatch & Room Folio Posting */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenSms(record)}
          className="flex-1 py-1.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:text-sky-300 text-[11px] font-bold transition-colors cursor-pointer text-center min-h-[36px] flex items-center justify-center gap-1"
        >
          <span>💬</span>
          <span>{t.sendSmsBtn}</span>
          {record.smsDispatchCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center font-mono">
              {record.smsDispatchCount}
            </span>
          )}
        </button>

        {record.isFolioPosted ? (
          <span className="py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold text-center">
            ✓ {t.folioPostedBadge}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onPostToFolio?.(record)}
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer min-h-[36px]"
          >
            {t.postFolioBtn}
          </button>
        )}
      </div>
    </div>
  );
};

export const AirportTransferBoard: FC<AirportTransferBoardProps> = ({
  transfers = DEFAULT_AIRPORT_TRANSFERS,
  hotelPropertyName = "Amaya Resort & Spa, Sri Lanka",
  lang = "en",
  onSendSms,
  onPostToFolio,
  onStatusChange,
}) => {
  const dialogId = useId();
  const t = AIRPORT_TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<"ALL" | "ARRIVAL" | "DEPARTURE">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // SMS Modal State
  const [activeSmsTransfer, setActiveSmsTransfer] = useState<AirportTransferRecord | null>(null);
  const [smsText, setSmsText] = useState<string>("");

  const filtered = useMemo(
    () => filterTransfers(transfers, activeTab, searchQuery),
    [transfers, activeTab, searchQuery],
  );

  const kpis = useMemo(() => calculateTransferSummary(transfers), [transfers]);

  const handleOpenSmsModal = (record: AirportTransferRecord): void => {
    setActiveSmsTransfer(record);
    setSmsText(generateDispatchSmsText(record, hotelPropertyName));
  };

  const handleConfirmSms = (): void => {
    if (!activeSmsTransfer) return;
    if (onSendSms) {
      onSendSms({
        recipientMobile: activeSmsTransfer.guestContactMobile,
        messageText: smsText,
        transferId: activeSmsTransfer.id,
      });
    }
    setActiveSmsTransfer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.boardTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.boardSubtitle}</p>
        </div>

        {/* Tab Filter Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.tabAll}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ARRIVAL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ARRIVAL"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            🛬 {t.tabArrivals}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DEPARTURE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "DEPARTURE"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            🛫 {t.tabDepartures}
          </button>
        </div>
      </div>

      {/* KPI Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t.kpiTotal}
          </span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums-lkr mt-1">
            {kpis.totalTransfers}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 shadow-sm">
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            {t.kpiArrivals}
          </span>
          <p className="text-xl font-extrabold text-sky-700 dark:text-sky-300 tabular-nums-lkr mt-1">
            {kpis.totalArrivals}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 shadow-sm">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {t.kpiDepartures}
          </span>
          <p className="text-xl font-extrabold text-purple-700 dark:text-purple-300 tabular-nums-lkr mt-1">
            {kpis.totalDepartures}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {t.kpiActiveDispatches}
          </span>
          <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums-lkr mt-1">
            {kpis.activeDispatches}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            {t.kpiUnpostedRevenue}
          </span>
          <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300 tabular-nums-lkr mt-1">
            {kpis.unpostedFolioRevenueLkr.toLocaleString()} LKR
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Search Transfers
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </label>
      </div>

      {/* Transfers Roster Grid / Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((record) => (
            <TransferCard
              key={record.id}
              record={record}
              t={t}
              onOpenSms={handleOpenSmsModal}
              onPostToFolio={onPostToFolio}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-3xl apple-liquid-glass bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {t.emptyTransfersMsg}
          </p>
        </div>
      )}

      {/* 1-Click SMS Dispatch Modal */}
      {activeSmsTransfer && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby={`${dialogId}-sms-title`}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 w-full h-full max-w-none max-h-none m-0 border-0"
        >
          <div className="relative w-full max-w-lg rounded-3xl apple-liquid-glass bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <h3
                  id={`${dialogId}-sms-title`}
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {t.smsModalTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guest: {activeSmsTransfer.guestName} ({activeSmsTransfer.roomNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSmsTransfer(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
                aria-label={t.closeBtn}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.smsRecipientLabel}
                  <input
                    type="text"
                    readOnly
                    value={activeSmsTransfer.guestContactMobile}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.smsContentLabel}
                  <textarea
                    rows={5}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-slate-800 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  SMS Gateway: SMSGo.lk Sri Lanka Route. Direct delivery with sender ID.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSmsTransfer(null)}
                className="px-4 py-2 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 transition-colors cursor-pointer min-h-[40px]"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleConfirmSms}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all cursor-pointer min-h-[40px]"
              >
                {t.confirmSmsBtn}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};
