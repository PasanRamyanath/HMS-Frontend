import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Printable Daily Housekeeping Floor Sheet (PrintableHkFloorSheet.tsx)
 *
 * Daily trolley clipboard sheet & digital interactive manager for hotel housekeeping attendants:
 * - Dual Mode: Interactive Apple HIG management workspace on-screen + high-density A4 clipboard sheet on print
 * - Built for Sri Lankan hotels, beach resorts, and luxury tea country villas
 * - Follows SLTDA (Sri Lanka Tourism Development Authority) hygiene and room inspection compliance
 * - Features:
 * - Floor / Wing selection & Attendant assignment
 * - Room status tracking (Checkouts, Stayovers, Arrivals, VIPs, Deep Clean)
 * - Minibar inspection checkboxes and consumption tracking
 * - Eco-linen & towel reuse policy tracking
 * - Physical handwritten checkboxes for time-in / time-out & supervisor sign-off
 * - Summary KPI cards with turnaround credits and completion progress
 * - Trilingual support: English (en), Sinhala (si), Tamil (ta)
 * - Strict Apple Human Interface Guidelines, .apple-liquid-glass, .tabular-nums-lkr, >=44x44pt targets
 * - Zero console/debugger noise, cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { isRoomReadyForCheckIn } from "../../staff/housekeeping/index.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HkFloorSheetRoomStatus =
  | "VACANT_DIRTY"
  | "OCCUPIED_DIRTY"
  | "CHECKOUT"
  | "STAYOVER"
  | "EXPECTED_ARRIVAL"
  | "VIP_IN_HOUSE"
  | "DEEP_CLEAN"
  | "OUT_OF_ORDER"
  | "INSPECTED_CLEAN";

export type HkLinenOption = "FULL_CHANGE" | "ECO_REUSE" | "TOWELS_ONLY" | "TURNDOWN_ONLY";

export type HkVipLevel = "VIP1" | "VIP2" | "VIP3" | "HONEYMOON" | "REPEAT_GUEST" | "REGULAR";

export type HkInspectionResult = "PENDING" | "PASSED" | "TOUCH_UP_REQUIRED";

export interface HkFloorSheetRoom {
  readonly roomId: string;
  readonly roomNumber: string;
  readonly roomType: string;
  readonly floorNumber: number;
  readonly wing: string;
  readonly status: HkFloorSheetRoomStatus;
  readonly guestName?: string | undefined;
  readonly paxAdults: number;
  readonly paxChildren: number;
  readonly vipLevel?: HkVipLevel | undefined;
  readonly specialRequests?: string | undefined;
  readonly linenOption: HkLinenOption;
  readonly minibarCheckRequired: boolean;
  readonly turnaroundCredits: number;
  readonly timeIn?: string | undefined;
  readonly timeOut?: string | undefined;
  readonly isMinibarRestocked?: boolean | undefined;
  readonly isLinenCompleted?: boolean | undefined;
  readonly attendantNotes?: string | undefined;
  readonly supervisorInspection: HkInspectionResult;
}

export interface HkFloorSheetMetadata {
  readonly sheetSerialNo: string;
  readonly propertyTitle: string;
  readonly sltdaLicenseNo: string;
  readonly date: string;
  readonly shift: "MORNING" | "EVENING" | "NIGHT";
  readonly shiftHours: string;
  readonly assignedAttendantId: string;
  readonly assignedAttendantName: string;
  readonly attendantContact?: string | undefined;
  readonly supervisorName: string;
  readonly floorNumber: number | "ALL";
  readonly wing?: string | undefined;
  readonly notes?: string | undefined;
}

export interface HkFloorSheetSummary {
  readonly totalRooms: number;
  readonly checkoutCount: number;
  readonly stayoverCount: number;
  readonly vacantDirtyCount: number;
  readonly vipCount: number;
  readonly deepCleanCount: number;
  readonly expectedArrivalsCount: number;
  readonly totalCredits: number;
  readonly estimatedHours: number;
  readonly completedCount: number;
  readonly inspectedPassedCount: number;
  readonly completionPct: number;
}

export type HkFloorFilter = number | "ALL";
export type HkStatusFilter = "ALL" | "DIRTY" | "CHECKOUT" | "STAYOVER" | "VIP" | "COMPLETED";

export interface PrintableHkFloorSheetProps {
  readonly tenantId?: string | undefined;
  readonly metadata?: Partial<HkFloorSheetMetadata> | undefined;
  readonly initialRooms?: readonly HkFloorSheetRoom[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPrintSheet?: (() => void) | undefined;
  readonly onUpdateRoom?:
    | ((roomId: string, updates: Partial<HkFloorSheetRoom>) => Promise<void> | void)
    | undefined;
  readonly onSignOff?:
    | ((attendantName: string, supervisorName: string) => Promise<void> | void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_FLOOR_SHEET_METADATA: HkFloorSheetMetadata = {
  sheetSerialNo: "HK-FS-20261020-04",
  propertyTitle: "Galle Face Heritage Hotel & Spa - Colombo",
  sltdaLicenseNo: "SLTDA/HOTEL/2026/0014",
  date: "2026-10-20",
  shift: "MORNING",
  shiftHours: "07:00 - 15:30",
  assignedAttendantId: "att-001",
  assignedAttendantName: "Sunil Bandara",
  attendantContact: "+94 77 123 4567",
  supervisorName: "Chaminda Silva (Executive HK)",
  floorNumber: 2,
  wing: "Ocean Wing & Colonial Suites",
  notes:
    "SLTDA Gold Standard protocol: replenish King Coconut and Ceylon tea pouches before 11:00. Check minibar locks.",
};

export const DEFAULT_FLOOR_SHEET_ROOMS: readonly HkFloorSheetRoom[] = [
  {
    roomId: "rm-201",
    roomNumber: "201",
    roomType: "Deluxe Ocean Suite",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "CHECKOUT",
    guestName: "Alexander Wright",
    paxAdults: 2,
    paxChildren: 0,
    vipLevel: "VIP1",
    specialRequests:
      "Departing 11:30. Collect laundry bag. Check safe deposit box before departure.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.5,
    timeIn: "08:15",
    timeOut: "08:55",
    isMinibarRestocked: true,
    isLinenCompleted: true,
    attendantNotes: "Room turned around. 2 Ceylon tea pouches replenished. Minibar intact.",
    supervisorInspection: "PASSED",
  },
  {
    roomId: "rm-202",
    roomNumber: "202",
    roomType: "Colonial Heritage Suite",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "STAYOVER",
    guestName: "Dr. Rohitha Perera",
    paxAdults: 2,
    paxChildren: 1,
    vipLevel: "REPEAT_GUEST",
    specialRequests: "Eco-linen reuse requested. Extra king coconut & extra bath towel requested.",
    linenOption: "ECO_REUSE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.0,
    timeIn: "09:05",
    timeOut: "09:30",
    isMinibarRestocked: true,
    isLinenCompleted: true,
    attendantNotes: "Eco tidy complete. Reusable glass water bottles refilled.",
    supervisorInspection: "PASSED",
  },
  {
    roomId: "rm-203",
    roomNumber: "203",
    roomType: "Superior King Ocean View",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "CHECKOUT",
    guestName: "Elena Rostova",
    paxAdults: 1,
    paxChildren: 0,
    vipLevel: "REGULAR",
    specialRequests: "Early check-out at 08:00 completed. Prepare for 13:00 arrival.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.5,
    timeIn: "09:40",
    timeOut: "10:20",
    isMinibarRestocked: true,
    isLinenCompleted: true,
    attendantNotes: "Full bed stripping, bathroom sanitized with lemongrass eco-cleaner.",
    supervisorInspection: "PASSED",
  },
  {
    roomId: "rm-204",
    roomNumber: "204",
    roomType: "Superior King Ocean View",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "OCCUPIED_DIRTY",
    guestName: "David & Sarah Miller",
    paxAdults: 2,
    paxChildren: 0,
    vipLevel: "HONEYMOON",
    specialRequests:
      "Honeymoon couple. Do Not Disturb until 11:00. Evening turndown with fresh frangipani blossoms.",
    linenOption: "TOWELS_ONLY",
    minibarCheckRequired: true,
    turnaroundCredits: 1.0,
    timeIn: undefined,
    timeOut: undefined,
    isMinibarRestocked: false,
    isLinenCompleted: false,
    attendantNotes: "Guest hung DND sign; scheduled for 11:30 revisit.",
    supervisorInspection: "PENDING",
  },
  {
    roomId: "rm-205",
    roomNumber: "205",
    roomType: "Junior Suite Ocean View",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "VACANT_DIRTY",
    guestName: undefined,
    paxAdults: 0,
    paxChildren: 0,
    vipLevel: undefined,
    specialRequests: "Vacated overnight at 03:00. Deep dust and vacuum needed.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.2,
    timeIn: undefined,
    timeOut: undefined,
    isMinibarRestocked: false,
    isLinenCompleted: false,
    supervisorInspection: "PENDING",
  },
  {
    roomId: "rm-206",
    roomNumber: "206",
    roomType: "Junior Suite Ocean View",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "DEEP_CLEAN",
    guestName: undefined,
    paxAdults: 0,
    paxChildren: 0,
    vipLevel: undefined,
    specialRequests:
      "Monthly scheduled deep-clean: AC duct sanitation, teak balcony wood oiling, tile grout polish.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: false,
    turnaroundCredits: 2.0,
    timeIn: undefined,
    timeOut: undefined,
    isMinibarRestocked: false,
    isLinenCompleted: false,
    supervisorInspection: "PENDING",
  },
  {
    roomId: "rm-207",
    roomNumber: "207",
    roomType: "Presidential Heritage Suite",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "EXPECTED_ARRIVAL",
    guestName: "Lord Sebastian Howard",
    paxAdults: 2,
    paxChildren: 0,
    vipLevel: "VIP3",
    specialRequests:
      "VIP3 Arrival at 14:00. Dual King Coconuts on ice, fresh orchids, organic Ceylon cinnamon diffuser running.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.5,
    timeIn: undefined,
    timeOut: undefined,
    isMinibarRestocked: false,
    isLinenCompleted: false,
    attendantNotes: "All VIP welcome setup ready on trolley.",
    supervisorInspection: "TOUCH_UP_REQUIRED",
  },
  {
    roomId: "rm-208",
    roomNumber: "208",
    roomType: "Executive Twin Ocean View",
    floorNumber: 2,
    wing: "Ocean Wing",
    status: "INSPECTED_CLEAN",
    guestName: undefined,
    paxAdults: 0,
    paxChildren: 0,
    vipLevel: undefined,
    specialRequests: "Inspected and sealed for walk-in guest.",
    linenOption: "FULL_CHANGE",
    minibarCheckRequired: true,
    turnaroundCredits: 1.0,
    timeIn: "07:30",
    timeOut: "08:10",
    isMinibarRestocked: true,
    isLinenCompleted: true,
    attendantNotes: "Cleaned by night shift attendant; verified complete.",
    supervisorInspection: "PASSED",
  },
];

// ============================================================================
// Translations
// ============================================================================

export interface FloorSheetTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly printButton: string;
  readonly printPreviewToggle: string;
  readonly interactiveView: string;
  readonly printSheetView: string;
  readonly floorLabel: string;
  readonly allFloors: string;
  readonly shiftLabel: string;
  readonly attendantLabel: string;
  readonly supervisorLabel: string;
  readonly serialLabel: string;
  readonly sltdaLabel: string;
  readonly totalRooms: string;
  readonly checkouts: string;
  readonly stayovers: string;
  readonly vipInHouse: string;
  readonly targetCredits: string;
  readonly estHours: string;
  readonly completion: string;
  readonly inspectedRooms: string;
  readonly roomCol: string;
  readonly statusCol: string;
  readonly guestCol: string;
  readonly linenCol: string;
  readonly minibarCol: string;
  readonly timeCol: string;
  readonly signCol: string;
  readonly notesCol: string;
  readonly actionsCol: string;
  readonly filterAll: string;
  readonly filterDirty: string;
  readonly filterCheckout: string;
  readonly filterStayover: string;
  readonly filterVip: string;
  readonly filterCompleted: string;
  readonly searchPlaceholder: string;
  readonly markComplete: string;
  readonly markPassed: string;
  readonly markTouchUp: string;
  readonly attendantSignature: string;
  readonly supervisorSignature: string;
  readonly completionTimestamp: string;
  readonly sltdaComplianceFooter: string;
  readonly trolleyNotice: string;
  readonly noRoomsMatch: string;
}

const TRANSLATIONS: Record<SupportedLanguage, FloorSheetTranslations> = {
  en: {
    title: "Daily Housekeeping Floor Sheet",
    subtitle: "Trolley Clipboard Sheet & Attendant Task Manager",
    printButton: "Print Clipboard Sheet",
    printPreviewToggle: "Toggle Print View",
    interactiveView: "Interactive Board",
    printSheetView: "A4 Clipboard Sheet",
    floorLabel: "Floor",
    allFloors: "All Floors",
    shiftLabel: "Shift",
    attendantLabel: "Assigned Attendant",
    supervisorLabel: "Executive HK / Supervisor",
    serialLabel: "Serial No",
    sltdaLabel: "SLTDA Reg No",
    totalRooms: "Total Rooms",
    checkouts: "Departure Cleans",
    stayovers: "Stayover Tidies",
    vipInHouse: "VIP In-House",
    targetCredits: "Workload Credits",
    estHours: "Est. Time",
    completion: "Progress",
    inspectedRooms: "Inspected & Passed",
    roomCol: "Room & Type",
    statusCol: "Status",
    guestCol: "Guest & VIP",
    linenCol: "Linen Protocol",
    minibarCol: "Minibar",
    timeCol: "Time In / Out",
    signCol: "Sign-Off",
    notesCol: "Instructions & Trolley Notes",
    actionsCol: "Actions",
    filterAll: "All Rooms",
    filterDirty: "Dirty Rooms",
    filterCheckout: "Checkouts",
    filterStayover: "Stayovers",
    filterVip: "VIP Rooms",
    filterCompleted: "Completed",
    searchPlaceholder: "Search room #, guest name, or type...",
    markComplete: "Mark Done",
    markPassed: "Pass Inspection",
    markTouchUp: "Needs Touch-up",
    attendantSignature: "Attendant Signature & Staff ID",
    supervisorSignature: "Executive HK / Supervisor Sign-off",
    completionTimestamp: "Shift Completion Timestamp",
    sltdaComplianceFooter:
      "Sri Lanka Tourism Development Authority (SLTDA) Standards & Hygiene Compliance Protocol — Section 14 Housekeeping Verification.",
    trolleyNotice: "Official Physical Trolley Clipboard Copy • Keep on Housekeeping Runner Cart",
    noRoomsMatch: "No rooms match the selected floor or status filter.",
  },
  si: {
    title: "දෛනික කාමර පිරිසිදු කිරීමේ ලේඛනය",
    subtitle: "ට්රොලි ක්ලිප්බෝඩ් පත්රිකාව සහ සේවක කාර්ය පාලකය",
    printButton: "ලේඛනය මුද්රණය කරන්න",
    printPreviewToggle: "මුද්රණ පෙනුම මාරු කරන්න",
    interactiveView: "අන්තර්ක්රියාකාරී පුවරුව",
    printSheetView: "A4 මුද්රිත පත්රිකාව",
    floorLabel: "මහල",
    allFloors: "සියලු මහල්",
    shiftLabel: "මුරය",
    attendantLabel: "පැවරුණු සේවකයා",
    supervisorLabel: "ප්රධාන පරීක්ෂක",
    serialLabel: "අනුක්රමික අංකය",
    sltdaLabel: "SLTDA ලියාපදිංචි අංකය",
    totalRooms: "මුළු කාමර",
    checkouts: "පිටත්වීම් පිරිසිදු කිරීම්",
    stayovers: "නවාතැන් පිරිසිදු කිරීම්",
    vipInHouse: "VIP කාමර",
    targetCredits: "කාර්ය භාරය",
    estHours: "ඇස්තමේන්තු ගත කාලය",
    completion: "ප්රගතිය",
    inspectedRooms: "පරීක්ෂා කර සම්මත වූ",
    roomCol: "කාමරය සහ වර්ගය",
    statusCol: "තත්ත්වය",
    guestCol: "අමුත්තා සහ VIP",
    linenCol: "රෙදිපිළි ප්රොටෝකෝලය",
    minibarCol: "මිනි බාර්",
    timeCol: "ආරම්භය / අවසානය",
    signCol: "අත්සන",
    notesCol: "උපදෙස් සහ සටහන්",
    actionsCol: "ක්රියා",
    filterAll: "සියලු කාමර",
    filterDirty: "අපිරිසිදු කාමර",
    filterCheckout: "පිටත්වීම්",
    filterStayover: "නවාතැන්",
    filterVip: "VIP කාමර",
    filterCompleted: "අවසන් වූ",
    searchPlaceholder: "කාමර අංකය හෝ නම සොයන්න...",
    markComplete: "අවසන් බව ලකුණු කරන්න",
    markPassed: "සම්මත කරන්න",
    markTouchUp: "නැවත පිරිසිදු කිරීම අවශ්යයි",
    attendantSignature: "සේවක අත්සන සහ හැඳුනුම්පත් අංකය",
    supervisorSignature: "ප්රධාන පරීක්ෂකගේ අත්සන",
    completionTimestamp: "මුරය අවසන් වූ වේලාව",
    sltdaComplianceFooter: "ශ්රී ලංකා සංචාරක සංවර්ධන අධිකාරිය (SLTDA) සනීපාරක්ෂක හා තත්ත්ව ප්රමිතීන් තහවුරු කිරීම.",
    trolleyNotice: "නිල භෞතික ට්රොලි ලේඛනය • කාමර පිරිසිදු කිරීමේ ට්රොලියේ තබා ගන්න",
    noRoomsMatch: "තෝරාගත් පෙරහනට අදාළ කාමර නොමැත.",
  },
  ta: {
    title: "தினசரி தூய்மைப்பணி தாள்",
    subtitle: "ட்ரோலி கிளிப்போர்டு தாள் மற்றும் பணியாளர் பணி மேலாளர்",
    printButton: "தாளை அச்சிடுக",
    printPreviewToggle: "அச்சு பார்வையை மாற்றுக",
    interactiveView: "ஊடாடும் பலகை",
    printSheetView: "A4 அச்சு தாள்",
    floorLabel: "தளம்",
    allFloors: "அனைத்து தளங்கள்",
    shiftLabel: "ஷிப்ட்",
    attendantLabel: "ஒதுக்கப்பட்ட பணியாளர்",
    supervisorLabel: "மேற்பார்வையாளர்",
    serialLabel: "வரிசை எண்",
    sltdaLabel: "SLTDA பதிவு எண்",
    totalRooms: "மொத்த அறைகள்",
    checkouts: "வெளியேறும் தூய்மைப்படுத்தல்கள்",
    stayovers: "தொடரும் தங்கல்கள்",
    vipInHouse: "விஐபி அறைகள்",
    targetCredits: "பணிச்சுமை புள்ளிகள்",
    estHours: "மதிப்பிடப்பட்ட நேரம்",
    completion: "முன்னேற்றம்",
    inspectedRooms: "ஆய்வு செய்யப்பட்டு தேர்ச்சி",
    roomCol: "அறை & வகை",
    statusCol: "நிலை",
    guestCol: "விருந்தினர் & விஐபி",
    linenCol: "துணி நெறிமுறை",
    minibarCol: "மினி பார்",
    timeCol: "தொடக்கம் / முடிவு",
    signCol: "கையொப்பம்",
    notesCol: "வழிமுறைகள் & குறிப்புகள்",
    actionsCol: "செயல்கள்",
    filterAll: "அனைத்து அறைகள்",
    filterDirty: "அழுக்கு அறைகள்",
    filterCheckout: "வெளியேறல்கள்",
    filterStayover: "தங்குதல்கள்",
    filterVip: "விஐபி அறைகள்",
    filterCompleted: "முடிந்தவை",
    searchPlaceholder: "அறை எண் அல்லது பெயர் தேடுக...",
    markComplete: "முடிந்ததாகக் குறிக்கவும்",
    markPassed: "தேர்ச்சி பெற்றது",
    markTouchUp: "மீண்டும் சுத்தம் செய்ய வேண்டும்",
    attendantSignature: "பணியாளர் கையொப்பம்",
    supervisorSignature: "மேற்பார்வையாளர் கையொப்பம்",
    completionTimestamp: "முடிந்த நேரம்",
    sltdaComplianceFooter:
      "இலங்கை சுற்றுலா அபிவிருத்தி அதிகாரசபை (SLTDA) தூய்மை மற்றும் சுகாதார இணக்க நெறிமுறை.",
    trolleyNotice: "அதிகாரப்பூர்வ ட்ரோலி ஆவணம் • தூய்மைப்பணி வண்டியில் வைத்திருக்கவும்",
    noRoomsMatch: "தேர்ந்தெடுக்கப்பட்ட வடிகட்டலுடன் எந்த அறையும் பொருந்தவில்லை.",
  },
};

// ============================================================================
// Pure Helpers
// ============================================================================

export function getFloorSheetText(lang: SupportedLanguage = "en"): FloorSheetTranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

function isRoomCompleted(r: HkFloorSheetRoom): boolean {
  return (
    isRoomReadyForCheckIn(r.status) ||
    r.supervisorInspection === "PASSED" ||
    (Boolean(r.timeOut) && Boolean(r.isLinenCompleted))
  );
}

interface RoomTally {
  checkoutCount: number;
  stayoverCount: number;
  vacantDirtyCount: number;
  vipCount: number;
  deepCleanCount: number;
  expectedArrivalsCount: number;
  totalCredits: number;
  completedCount: number;
  inspectedPassedCount: number;
}

function tallySingleRoom(r: HkFloorSheetRoom, acc: RoomTally): void {
  acc.totalCredits += r.turnaroundCredits;
  if (r.status === "CHECKOUT") acc.checkoutCount += 1;
  if (r.status === "STAYOVER" || r.status === "OCCUPIED_DIRTY") acc.stayoverCount += 1;
  if (r.status === "VACANT_DIRTY") acc.vacantDirtyCount += 1;
  if (r.vipLevel && r.vipLevel !== "REGULAR") acc.vipCount += 1;
  if (r.status === "DEEP_CLEAN") acc.deepCleanCount += 1;
  if (r.status === "EXPECTED_ARRIVAL") acc.expectedArrivalsCount += 1;
  if (isRoomCompleted(r)) acc.completedCount += 1;
  if (r.supervisorInspection === "PASSED") acc.inspectedPassedCount += 1;
}

export function calculateFloorSheetSummary(
  rooms: readonly HkFloorSheetRoom[],
): HkFloorSheetSummary {
  if (rooms.length === 0) {
    return {
      totalRooms: 0,
      checkoutCount: 0,
      stayoverCount: 0,
      vacantDirtyCount: 0,
      vipCount: 0,
      deepCleanCount: 0,
      expectedArrivalsCount: 0,
      totalCredits: 0,
      estimatedHours: 0,
      completedCount: 0,
      inspectedPassedCount: 0,
      completionPct: 0,
    };
  }

  const tally: RoomTally = {
    checkoutCount: 0,
    stayoverCount: 0,
    vacantDirtyCount: 0,
    vipCount: 0,
    deepCleanCount: 0,
    expectedArrivalsCount: 0,
    totalCredits: 0,
    completedCount: 0,
    inspectedPassedCount: 0,
  };

  for (const r of rooms) {
    tallySingleRoom(r, tally);
  }

  // 1 credit ~ 30 minutes of standard hotel housekeeping work (half-up rounding to 1 decimal)
  const estimatedHours = Math.round(((tally.totalCredits * 30) / 60) * 10) / 10;
  const completionPct =
    rooms.length > 0 ? Math.round((tally.completedCount / rooms.length) * 100) : 0;

  return {
    totalRooms: rooms.length,
    checkoutCount: tally.checkoutCount,
    stayoverCount: tally.stayoverCount,
    vacantDirtyCount: tally.vacantDirtyCount,
    vipCount: tally.vipCount,
    deepCleanCount: tally.deepCleanCount,
    expectedArrivalsCount: tally.expectedArrivalsCount,
    totalCredits: Number(tally.totalCredits.toFixed(1)),
    estimatedHours,
    completedCount: tally.completedCount,
    inspectedPassedCount: tally.inspectedPassedCount,
    completionPct,
  };
}

function isFloorMatching(room: HkFloorSheetRoom, filter: HkFloorFilter): boolean {
  return filter === "ALL" || room.floorNumber === filter;
}

function isStatusMatching(room: HkFloorSheetRoom, filter: HkStatusFilter): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "DIRTY":
      return (
        room.status === "VACANT_DIRTY" ||
        room.status === "OCCUPIED_DIRTY" ||
        room.status === "CHECKOUT"
      );
    case "CHECKOUT":
      return room.status === "CHECKOUT";
    case "STAYOVER":
      return room.status === "STAYOVER" || room.status === "OCCUPIED_DIRTY";
    case "VIP":
      return Boolean(room.vipLevel) && room.vipLevel !== "REGULAR";
    case "COMPLETED":
      return room.status === "INSPECTED_CLEAN" || room.supervisorInspection === "PASSED";
  }
}

function isSearchQueryMatching(room: HkFloorSheetRoom, query: string): boolean {
  if (query.length === 0) return true;
  return (
    room.roomNumber.toLowerCase().includes(query) ||
    room.roomType.toLowerCase().includes(query) ||
    (room.guestName ?? "").toLowerCase().includes(query) ||
    (room.specialRequests ?? "").toLowerCase().includes(query)
  );
}

export function filterFloorSheetRooms(
  rooms: readonly HkFloorSheetRoom[],
  floorFilter: HkFloorFilter,
  statusFilter: HkStatusFilter,
  searchQuery = "",
): HkFloorSheetRoom[] {
  const query = searchQuery.trim().toLowerCase();
  return rooms.filter(
    (r) =>
      isFloorMatching(r, floorFilter) &&
      isStatusMatching(r, statusFilter) &&
      isSearchQueryMatching(r, query),
  );
}

export function resolveRoomStatusBadge(status: HkFloorSheetRoomStatus): {
  label: string;
  badgeClass: string;
  printBadge: string;
  icon: string;
} {
  switch (status) {
    case "CHECKOUT":
      return {
        label: "Checkout Clean",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 ",
        printBadge: "[CHECKOUT]",
        icon: "Door",
      };
    case "STAYOVER":
    case "OCCUPIED_DIRTY":
      return {
        label: "Stayover Tidy",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 ",
        printBadge: "[STAYOVER]",
        icon: "Room",
      };
    case "VACANT_DIRTY":
      return {
        label: "Vacant Dirty",
        badgeClass: "bg-orange-50 text-orange-700 border-orange-200 ",
        printBadge: "[VACANT-DIRTY]",
        icon: "Clean",
      };
    case "EXPECTED_ARRIVAL":
      return {
        label: "Expected Arrival",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 ",
        printBadge: "[EXP-ARRIVAL]",
        icon: "Bell",
      };
    case "VIP_IN_HOUSE":
      return {
        label: "VIP In-House",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200 ",
        printBadge: "VIP",
        icon: "Royal",
      };
    case "DEEP_CLEAN":
      return {
        label: "Deep Clean Due",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 ",
        printBadge: "[DEEP-CLEAN]",
        icon: "Clean",
      };
    case "OUT_OF_ORDER":
      return {
        label: "Out of Order",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 ",
        printBadge: "[OOO]",
        icon: "Alert",
      };
    case "INSPECTED_CLEAN":
      return {
        label: "Inspected Clean",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 ",
        printBadge: "[CLEAN-PASSED]",
        icon: "Done",
      };
  }
}

export function resolveLinenOptionBadge(option: HkLinenOption): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  switch (option) {
    case "FULL_CHANGE":
      return {
        label: "Full Change",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200 ",
        icon: "Sync",
      };
    case "ECO_REUSE":
      return {
        label: "Eco-Reuse (Tidy)",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 ",
        icon: "Eco",
      };
    case "TOWELS_ONLY":
      return {
        label: "Towels Only",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 ",
        icon: "Bath",
      };
    case "TURNDOWN_ONLY":
      return {
        label: "Turndown Only",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200 ",
        icon: "Night",
      };
  }
}

export function resolveVipBadge(
  vip?: HkVipLevel,
): { label: string; badgeClass: string; icon: string } | null {
  if (!vip || vip === "REGULAR") return null;

  switch (vip) {
    case "VIP1":
      return {
        label: "VIP 1 (Silver)",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-300 ",
        icon: "2nd",
      };
    case "VIP2":
      return {
        label: "VIP 2 (Gold)",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 ",
        icon: "1st",
      };
    case "VIP3":
      return {
        label: "VIP 3 (Platinum)",
        badgeClass: "bg-purple-100 text-purple-900 border-purple-300 ",
        icon: "Royal",
      };
    case "HONEYMOON":
      return {
        label: "Honeymooners",
        badgeClass: "bg-rose-100 text-rose-900 border-rose-300 ",
        icon: "Floral",
      };
    case "REPEAT_GUEST":
      return {
        label: "Repeat Patron",
        badgeClass: "bg-teal-100 text-teal-900 border-teal-300 ",
        icon: "Star",
      };
  }
}

export function resolveInspectionBadge(inspection: HkInspectionResult): {
  label: string;
  badgeClass: string;
} {
  switch (inspection) {
    case "PASSED":
      return {
        label: "Passed",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 ",
      };
    case "TOUCH_UP_REQUIRED":
      return {
        label: "Touch-Up Req.",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 ",
      };
    case "PENDING":
      return {
        label: "Pending",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200 ",
      };
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface FloorSheetKpiProps {
  readonly summary: HkFloorSheetSummary;
  readonly text: FloorSheetTranslations;
}

function FloorSheetKpiBento({ summary, text }: FloorSheetKpiProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
      <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-md">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          {text.totalRooms}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {summary.totalRooms}
          </span>
          <span className="text-xs text-slate-500 ">({summary.totalCredits} credits)</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {summary.checkoutCount} departures • {summary.stayoverCount} stayovers
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-md">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          {text.estHours}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {summary.estimatedHours} hrs
          </span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Based on 30m / credit SLA</div>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-md">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          {text.vipInHouse}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-purple-600 tabular-nums">
            {summary.vipCount}
          </span>
          <span className="text-xs text-slate-500 ">{summary.expectedArrivalsCount} arriving</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">High-priority amenities ready</div>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-md">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          {text.completion}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">
            {summary.completionPct}%
          </span>
          <span className="text-xs text-slate-500 ">
            ({summary.completedCount}/{summary.totalRooms})
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${summary.completionPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface PrintTableRowProps {
  readonly room: HkFloorSheetRoom;
}

function PrintTableRow({ room }: PrintTableRowProps) {
  const statusInfo = resolveRoomStatusBadge(room.status);
  const linenInfo = resolveLinenOptionBadge(room.linenOption);
  const vipInfo = resolveVipBadge(room.vipLevel);

  return (
    <tr className="border-b border-black break-inside-avoid print:break-inside-avoid">
      {/* Room # */}
      <td className="border border-black p-1.5 text-center font-bold text-sm font-mono align-top">
        {room.roomNumber}
        <div className="text-[9px] font-normal font-sans text-slate-600">F{room.floorNumber}</div>
      </td>

      {/* Status */}
      <td className="border border-black p-1.5 align-top">
        <span className="font-bold text-[11px] block">{statusInfo.label}</span>
        <span className="text-[9px] text-slate-600 block">{room.roomType}</span>
        <span className="text-[9px] text-slate-600">({room.turnaroundCredits} cr)</span>
      </td>

      {/* Guest & VIP */}
      <td className="border border-black p-1.5 align-top">
        <div className="font-semibold text-[11px]">{room.guestName ?? "— Vacant —"}</div>
        {vipInfo && (
          <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[9px] font-bold border border-black bg-slate-100">
            {vipInfo.label}
          </span>
        )}
        {room.paxAdults > 0 && (
          <div className="text-[9px] text-slate-600">
            Pax: {room.paxAdults}A {room.paxChildren > 0 ? `+ ${room.paxChildren}C` : ""}
          </div>
        )}
      </td>

      {/* Linen */}
      <td className="border border-black p-1.5 align-top text-[10px]">
        <div className="font-bold">{linenInfo.label}</div>
        <div className="mt-1 flex items-center gap-1">
          <span className="inline-block w-3 h-3 border border-black" />
          <span className="text-[9px]">Replaced</span>
        </div>
      </td>

      {/* Minibar */}
      <td className="border border-black p-1.5 align-top text-center text-[10px]">
        {room.minibarCheckRequired ? (
          <div className="space-y-0.5 text-left pl-1">
            <div className="flex items-center gap-1 text-[9px]">
              <span className="inline-block w-2.5 h-2.5 border border-black" />
              <span>Ok</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span className="inline-block w-2.5 h-2.5 border border-black" />
              <span>Used</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span className="inline-block w-2.5 h-2.5 border border-black" />
              <span>Restock</span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-[10px]">N/A</span>
        )}
      </td>

      {/* Time In / Out */}
      <td className="border border-black p-1.5 align-top text-center font-mono text-[10px]">
        <div>In: {room.timeIn ?? "____:____"}</div>
        <div className="mt-1">Out: {room.timeOut ?? "____:____"}</div>
      </td>

      {/* Attendant Sign / Done */}
      <td className="border border-black p-1.5 align-top text-center">
        <div className="w-4 h-4 border border-black mx-auto mb-1 flex items-center justify-center font-bold text-xs">
          {room.status === "INSPECTED_CLEAN" ? "OK" : ""}
        </div>
        <span className="text-[8px] uppercase text-slate-500 block">Cleaned</span>
      </td>

      {/* Special Instructions & Notes */}
      <td className="border border-black p-1.5 align-top text-[10px] leading-tight">
        {room.specialRequests && (
          <div className="font-semibold text-slate-900 mb-1">* {room.specialRequests}</div>
        )}
        {room.attendantNotes && <div className="text-slate-600 italic">{room.attendantNotes}</div>}
        <div className="border-b border-dotted border-slate-400 mt-2 h-4" />
      </td>
    </tr>
  );
}

interface InteractiveRoomCardProps {
  readonly room: HkFloorSheetRoom;
  readonly text: FloorSheetTranslations;
  readonly onToggleClean: (room: HkFloorSheetRoom) => void;
  readonly onToggleMinibar: (roomId: string) => void;
}

interface RoomGuestSnippetProps {
  readonly room: HkFloorSheetRoom;
}

function RoomGuestSnippet({ room }: RoomGuestSnippetProps) {
  if (!room.guestName) return null;
  const vipInfo = resolveVipBadge(room.vipLevel);

  return (
    <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 mb-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-xs text-slate-900 ">{room.guestName}</span>
        {vipInfo && (
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${vipInfo.badgeClass}`}
          >
            {vipInfo.label}
          </span>
        )}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">
        Guests: {room.paxAdults} Adults{" "}
        {room.paxChildren > 0 ? `• ${room.paxChildren} Children` : ""}
      </div>
    </div>
  );
}

interface RoomLinenMinibarBarProps {
  readonly room: HkFloorSheetRoom;
  readonly onToggleMinibar: (roomId: string) => void;
}

function RoomLinenMinibarBar({ room, onToggleMinibar }: RoomLinenMinibarBarProps) {
  const linenInfo = resolveLinenOptionBadge(room.linenOption);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
      <span
        className={`px-2 py-0.5 rounded-xl text-[11px] font-medium border flex items-center gap-1 ${linenInfo.badgeClass}`}
      >
        <span>
          <DynamicTokenIcon token={linenInfo.icon} />
        </span>
        <span>{linenInfo.label}</span>
      </span>

      {room.minibarCheckRequired && (
        <button
          type="button"
          onClick={() => onToggleMinibar(room.roomId)}
          className={`px-2 py-0.5 rounded-xl text-[11px] font-medium border flex items-center gap-1 transition-all ${
            room.isMinibarRestocked
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <span>{room.isMinibarRestocked ? "Minibar Restocked" : "Minibar Check"}</span>
        </button>
      )}
    </div>
  );
}

function InteractiveRoomCard({
  room,
  text,
  onToggleClean,
  onToggleMinibar,
}: InteractiveRoomCardProps) {
  const statusInfo = resolveRoomStatusBadge(room.status);
  const isClean = isRoomReadyForCheckIn(room.status) || room.supervisorInspection === "PASSED";

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between ${
        isClean
          ? "bg-white/90 border-emerald-300/80 shadow-sm"
          : "bg-white/70 border-slate-200/80 shadow-sm hover:shadow-md"
      }`}
    >
      <div>
        {/* Card Top: Room # and Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono text-slate-900 ">
              {room.roomNumber}
            </span>
            <span className="text-xs text-slate-500 ">
              Floor {room.floorNumber} • {room.wing}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${statusInfo.badgeClass}`}
          >
            <span aria-hidden="true">
              <DynamicTokenIcon token={statusInfo.icon} />
            </span>
            <span>{statusInfo.label}</span>
          </span>
        </div>

        {/* Room Type & Credits */}
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span>{room.roomType}</span>
          <span className="font-semibold text-slate-700 ">{room.turnaroundCredits} credits</span>
        </div>

        {/* Guest & VIP Info */}
        <RoomGuestSnippet room={room} />

        {/* Linen & Minibar Badges */}
        <RoomLinenMinibarBar room={room} onToggleMinibar={onToggleMinibar} />

        {/* Special instructions */}
        {room.specialRequests && (
          <p className="text-xs text-amber-800 bg-amber-50/80 p-2 rounded-xl border border-amber-200 mb-2 leading-relaxed">
            * {room.specialRequests}
          </p>
        )}
      </div>

      {/* Bottom Action button */}
      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500 ">
          {room.timeIn ? `In: ${room.timeIn}` : "Not started"}{" "}
          {room.timeOut ? `• Out: ${room.timeOut}` : ""}
        </div>

        <button
          type="button"
          onClick={() => onToggleClean(room)}
          className={`min-h-[44px] px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 ${
            isClean
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 "
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          <span>{isClean ? "Undo" : "OK"}</span>
          <span>{isClean ? text.markTouchUp : text.markComplete}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const PrintableHkFloorSheet: FC<PrintableHkFloorSheetProps> = ({
  metadata: initialMeta,
  initialRooms,
  language = "en",
  onPrintSheet,
  onUpdateRoom,
  className = "",
}) => {
  const meta: HkFloorSheetMetadata = useMemo(
    () => ({ ...DEFAULT_FLOOR_SHEET_METADATA, ...initialMeta }),
    [initialMeta],
  );

  const [rooms, setRooms] = useState<readonly HkFloorSheetRoom[]>(
    initialRooms ?? DEFAULT_FLOOR_SHEET_ROOMS,
  );
  const [floorFilter, setFloorFilter] = useState<HkFloorFilter>(meta.floorNumber);
  const [statusFilter, setStatusFilter] = useState<HkStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrintView, setIsPrintView] = useState(false);

  const searchInputId = useId();
  const text = useMemo(() => getFloorSheetText(language), [language]);

  const summary = useMemo(() => calculateFloorSheetSummary(rooms), [rooms]);

  const filteredRooms = useMemo(
    () => filterFloorSheetRooms(rooms, floorFilter, statusFilter, searchQuery),
    [rooms, floorFilter, statusFilter, searchQuery],
  );

  const handlePrint = () => {
    if (onPrintSheet) {
      onPrintSheet();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleToggleRoomClean = (room: HkFloorSheetRoom) => {
    const isCurrentlyClean =
      isRoomReadyForCheckIn(room.status) || room.supervisorInspection === "PASSED";
    const nextStatus: HkFloorSheetRoomStatus = isCurrentlyClean
      ? "OCCUPIED_DIRTY"
      : "INSPECTED_CLEAN";
    const nextInspection: HkInspectionResult = isCurrentlyClean ? "PENDING" : "PASSED";

    const updated = rooms.map((r) =>
      r.roomId === room.roomId
        ? {
            ...r,
            status: nextStatus,
            supervisorInspection: nextInspection,
            timeOut: isCurrentlyClean ? undefined : "11:45",
            isLinenCompleted: !isCurrentlyClean,
            isMinibarRestocked: !isCurrentlyClean,
          }
        : r,
    );
    setRooms(updated);
    if (onUpdateRoom) {
      void onUpdateRoom(room.roomId, {
        status: nextStatus,
        supervisorInspection: nextInspection,
      });
    }
  };

  const handleToggleMinibar = (roomId: string) => {
    const updated = rooms.map((r) =>
      r.roomId === roomId ? { ...r, isMinibarRestocked: !r.isMinibarRestocked } : r,
    );
    setRooms(updated);
  };

  return (
    <div className={`printable-hk-floor-sheet font-sans text-slate-900 ${className}`}>
      {/* ==================================================================== */}
      {/* SCREEN TOOLBAR (Hidden on Print) */}
      {/* ==================================================================== */}
      <div className="print:hidden space-y-4 mb-6">
        {/* Top bar with Property title & Print button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 ">{text.title}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ">
                Shift: {meta.shift} ({meta.shiftHours})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {meta.propertyTitle} • {text.serialLabel}:{" "}
              <span className="font-mono">{meta.sheetSerialNo}</span> • Attendant:{" "}
              <span className="font-semibold text-slate-700 ">{meta.assignedAttendantName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPrintView((prev) => !prev)}
              className="min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-semibold border border-slate-200 bg-white/70 hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <span>
                <DynamicTokenIcon token={isPrintView ? "Mobile" : "Doc"} />
              </span>
              <span>{isPrintView ? text.interactiveView : text.printSheetView}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              <span>{text.printButton}</span>
            </button>
          </div>
        </div>

        {/* KPI Bento summary */}
        <FloorSheetKpiBento summary={summary} text={text} />

        {/* Filters and search row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 border border-slate-200/80 ">
          {/* Floor tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-medium text-slate-400 mr-1.5 shrink-0">
              {text.floorLabel}:
            </span>
            <button
              type="button"
              onClick={() => setFloorFilter("ALL")}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                floorFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 "
              }`}
            >
              {text.allFloors}
            </button>
            {[1, 2, 3, 4].map((fl) => (
              <button
                key={fl}
                type="button"
                onClick={() => setFloorFilter(fl)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  floorFilter === fl
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 "
                }`}
              >
                F{fl}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: text.filterAll },
              { id: "DIRTY", label: text.filterDirty },
              { id: "CHECKOUT", label: text.filterCheckout },
              { id: "STAYOVER", label: text.filterStayover },
              { id: "VIP", label: text.filterVip },
              { id: "COMPLETED", label: text.filterCompleted },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as HkStatusFilter)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 "
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative shrink-0 md:w-64">
            <label htmlFor={searchInputId} className="sr-only">
              {text.searchPlaceholder}
            </label>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={text.searchPlaceholder}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PRINT-OPTIMIZED PHYSICAL CLIPBOARD SHEET */}
      {/* Visible always on print; visible on screen when isPrintView is true */}
      {/* ==================================================================== */}
      <div
        className={`print-sheet-root ${
          isPrintView ? "block" : "hidden print:block"
        } bg-white text-black p-4 sm:p-6 border border-slate-300 print:border-none print:p-0 rounded-2xl print:rounded-none max-w-5xl mx-auto shadow-sm print:shadow-none`}
      >
        {/* Trolley Top Bar / SLTDA Notice */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3 text-[10px] uppercase font-bold tracking-wider">
          <span>{text.trolleyNotice}</span>
          <span>
            {text.sltdaLabel}: {meta.sltdaLicenseNo}
          </span>
        </div>

        {/* Physical Sheet Header Block */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border-b-2 border-black pb-3 mb-3 text-xs">
          <div>
            <h1 className="text-base font-extrabold uppercase tracking-tight leading-tight">
              {meta.propertyTitle}
            </h1>
            <p className="text-[11px] font-semibold text-slate-700">
              {meta.wing ?? "All Wings"} • Floor:{" "}
              {meta.floorNumber === "ALL" ? text.allFloors : `Floor ${meta.floorNumber}`}
            </p>
          </div>

          <div className="text-left md:text-center">
            <h2 className="text-sm font-bold uppercase tracking-wider">{text.title}</h2>
            <div className="font-mono text-[11px] font-bold">
              {text.serialLabel}: {meta.sheetSerialNo}
            </div>
            <div className="text-[11px]">
              Date: <span className="font-bold">{meta.date}</span> • Shift:{" "}
              <span className="font-bold">{meta.shift}</span> ({meta.shiftHours})
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 text-left md:text-right border-t md:border-t-0 pt-1 md:pt-0">
            <div className="text-[11px]">
              {text.attendantLabel}:{" "}
              <span className="font-bold text-xs">{meta.assignedAttendantName}</span>
            </div>
            {meta.attendantContact && (
              <div className="text-[10px] text-slate-600">Mob: {meta.attendantContact}</div>
            )}
            <div className="text-[11px]">
              {text.supervisorLabel}: <span className="font-semibold">{meta.supervisorName}</span>
            </div>
          </div>
        </div>

        {/* Printable Trolley Workload Banner */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 border border-black p-2 mb-3 text-center text-xs font-semibold">
          <div>
            <span className="block text-[9px] uppercase text-slate-600">{text.totalRooms}</span>
            <span className="text-sm font-extrabold tabular-nums">{summary.totalRooms}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-slate-600">{text.checkouts}</span>
            <span className="text-sm font-extrabold tabular-nums">{summary.checkoutCount}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-slate-600">{text.stayovers}</span>
            <span className="text-sm font-extrabold tabular-nums">{summary.stayoverCount}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-slate-600">{text.vipInHouse}</span>
            <span className="text-sm font-extrabold tabular-nums">{summary.vipCount}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-slate-600">{text.targetCredits}</span>
            <span className="text-sm font-extrabold tabular-nums">
              {summary.totalCredits} ({summary.estimatedHours}h)
            </span>
          </div>
        </div>

        {/* Printable Clipboard Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse border border-black text-left text-xs">
            <thead>
              <tr className="bg-slate-200 border-b border-black text-[10px] uppercase font-bold tracking-wider">
                <th className="border border-black p-1.5 w-16 text-center">{text.roomCol}</th>
                <th className="border border-black p-1.5 w-28">{text.statusCol}</th>
                <th className="border border-black p-1.5 w-40">{text.guestCol}</th>
                <th className="border border-black p-1.5 w-28">{text.linenCol}</th>
                <th className="border border-black p-1.5 w-24 text-center">{text.minibarCol}</th>
                <th className="border border-black p-1.5 w-28 text-center">{text.timeCol}</th>
                <th className="border border-black p-1.5 w-20 text-center">{text.signCol}</th>
                <th className="border border-black p-1.5">{text.notesCol}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-black p-4 text-center text-slate-500">
                    {text.noRoomsMatch}
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => <PrintTableRow key={room.roomId} room={room} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Physical Trolley Sign-off & Handover Box */}
        <div className="border-2 border-black p-3 mb-2 text-xs break-inside-avoid print:break-inside-avoid">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                {text.attendantSignature}
              </span>
              <div className="flex items-end gap-2 h-10 border-b border-black pb-1">
                <span className="font-bold">{meta.assignedAttendantName}</span>
                <span className="text-[10px] text-slate-500">(ID: {meta.assignedAttendantId})</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                I certify that all rooms marked have been sanitized to SLTDA hygiene protocols.
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                {text.supervisorSignature}
              </span>
              <div className="flex items-end gap-2 h-10 border-b border-black pb-1">
                <span className="font-bold">{meta.supervisorName}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                Random inspection pass rate:{" "}
                <span className="font-bold">{summary.inspectedPassedCount} rooms verified</span>.
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-300 text-[9px] text-slate-600 text-center">
            {text.sltdaComplianceFooter}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* INTERACTIVE WORKSPACE VIEW (Hidden when isPrintView is active) */}
      {/* ==================================================================== */}
      {!isPrintView && (
        <div className="print:hidden space-y-3">
          {filteredRooms.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/70 border border-slate-200/80 backdrop-blur-md">
              <p className="text-sm font-semibold text-slate-700 ">{text.noRoomsMatch}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRooms.map((room) => (
                <InteractiveRoomCard
                  key={room.roomId}
                  room={room}
                  text={text}
                  onToggleClean={handleToggleRoomClean}
                  onToggleMinibar={handleToggleMinibar}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
