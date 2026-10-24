import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Event-Day Live Plate Counter & Extra-Pax Overflow Tracker (LiveBanquetPlateCounter.tsx)
 *
 * Implements Step 337 (Phase 14.12) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized smartphone & tablet operations tool for the Banquet Captain at Sri Lankan wedding receptions,
 * banquet dinners, and corporate functions:
 *
 * 1. Live Plate Counting & Extra-Pax Reconciliation:
 * - Real-time plate issuance tracking: Guaranteed Pax (e.g. 200) vs Actual Issued (e.g. 214) -> Extra Pax (+14).
 * - Kitchen Buffer Pax monitoring (e.g. +20 buffer plates before kitchen food exhaustion).
 * - Tactile >= 44x44pt 1-tap increment buttons (+1, +5, +10, -1 correction).
 * 2. Instant Extra Bites & Chasers On-the-Fly Ordering:
 * - Live order entry for extra Devilled Chicken, Hot Butter Cuttlefish (HBC), Cashew Fry,
 * Soda, Elephant House Ginger Beer (EGB), Tonic, and Ice Buckets during dinner.
 * 3. Real-Time Financial Settlement Calculation:
 * - Computes Base Pax, Extra Pax Overflow, Extra Bites/Chasers, 10% Service Charge,
 * 1% TDL, 2.5% SSCL, and 18% VAT.
 * 4. Apple Human Interface Guidelines:
 * - OLED high-contrast vibrancy cards with Apple dynamic system colors:
 * systemGreen (#34C759) Within Guarantee, systemAmber (#FF9500) Buffer Warning,
 * systemRed (#FF3B30) Extra Pax Overflow.
 * - Translucent .apple-liquid-glass backdrop surfaces.
 * - .tabular-nums-lkr typography for monetary amounts and counters.
 * - Screen Wake-Lock API integration to prevent display sleep during service.
 * - Web Audio API harmonic glass and warning chimes.
 * - IndexedDB offline queue persistence when ballroom Wi-Fi disconnects.
 * - 80mm POS Thermal Slip print layout and preview.
 * 5. Trilingual Localization (English, සිංහල, தமிழ்).
 * 6. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useCallback, useEffect, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { enqueueMutation } from "../../lib/offlineQueue.js";
import { useSoundAlert } from "../../lib/soundAlert.js";
import { useWakeLock } from "../../lib/useWakeLock.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type OverflowStatus = "WITHIN_GUARANTEE" | "EXTRA_PAX_BUFFER" | "BUFFER_EXCEEDED";

export type ExtraItemCategory = "BITE" | "CHASER";

export interface BanquetExtraItem {
  readonly id: string;
  readonly name: string;
  readonly nameSi: string;
  readonly nameTa: string;
  readonly category: ExtraItemCategory;
  readonly unitPriceLkr: number;
  readonly unitLabel: string;
}

export interface BanquetExtraOrder {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly category: ExtraItemCategory;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly totalPriceLkr: number;
  readonly tableRef: string;
  readonly status: "PREPARING" | "SERVED";
  readonly orderedAtIso: string;
}

export interface PlateCountLogEntry {
  readonly id: string;
  readonly timestampIso: string;
  readonly delta: number;
  readonly totalAfter: number;
  readonly station: string;
  readonly notes?: string | undefined;
}

export interface BanquetEventSummary {
  readonly eventId: string;
  readonly functionNumber: string;
  readonly clientName: string;
  readonly contactPhone: string;
  readonly hallName: string;
  readonly eventDate: string;
  readonly guaranteedPax: number;
  readonly bufferPax: number;
  readonly ratePerPlateLkr: number;
  readonly initialIssuedPax?: number | undefined;
  readonly captainName: string;
}

export interface BanquetSettlementSummary {
  readonly guaranteedPax: number;
  readonly issuedPax: number;
  readonly extraPax: number;
  readonly ratePerPlateLkr: number;
  readonly basePlateTotalLkr: number;
  readonly extraPaxAmountLkr: number;
  readonly extraBitesTotalLkr: number;
  readonly extraChasersTotalLkr: number;
  readonly grossSubtotalLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
}

export interface BanquetLiveSettlementPayload {
  readonly eventId: string;
  readonly functionNumber: string;
  readonly clientName: string;
  readonly hallName: string;
  readonly guaranteedPax: number;
  readonly issuedPax: number;
  readonly extraPax: number;
  readonly settlement: BanquetSettlementSummary;
  readonly extraOrders: readonly BanquetExtraOrder[];
  readonly plateLogs: readonly PlateCountLogEntry[];
  readonly captainName: string;
  readonly syncedAtIso: string;
}

export interface LiveBanquetPlateCounterProps {
  readonly initialEvent?: BanquetEventSummary | undefined;
  readonly initialExtraOrders?: readonly BanquetExtraOrder[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly isDarkMode?: boolean | undefined;
  readonly onSyncSettlement?: ((payload: BanquetLiveSettlementPayload) => void) | undefined;
  readonly onPrintSlip?: ((slipText: string) => void) | undefined;
}

// ============================================================================
// Default Datasets & Catalogs
// ============================================================================

export const DEFAULT_BANQUET_EVENT: BanquetEventSummary = {
  eventId: "BNQ-2026-0889",
  functionNumber: "BEO-9842",
  clientName: "Samarawickrama & Perera Wedding",
  contactPhone: "+94 77 123 4567",
  hallName: "Grand Ballroom Sapphire",
  eventDate: "2026-10-25",
  guaranteedPax: 200,
  bufferPax: 20,
  ratePerPlateLkr: 8500,
  initialIssuedPax: 200,
  captainName: "Priyantha Perera (Banquet Captain)",
};

export const DEFAULT_BANQUET_EXTRA_CATALOG: readonly BanquetExtraItem[] = [
  {
    id: "bite-hbc",
    name: "Hot Butter Cuttlefish (HBC)",
    nameSi: "හොට් බටර් දැල්ලෝ පිඟාන",
    nameTa: "சூடான வெண்ணெய் கணவாய்",
    category: "BITE",
    unitPriceLkr: 3800,
    unitLabel: "Platter",
  },
  {
    id: "bite-devilled-chicken",
    name: "Devilled Chicken Platter",
    nameSi: "ඩෙවිල්ඩ් චිකන් පිඟාන",
    nameTa: "டெவில்ட் கோழி இறைச்சி",
    category: "BITE",
    unitPriceLkr: 2600,
    unitLabel: "Platter",
  },
  {
    id: "bite-devilled-pork",
    name: "Devilled Pork Belly Platter",
    nameSi: "ඌරු මස් ඩෙවිල් පිඟාන",
    nameTa: "டெவில்ட் பன்றி இறைச்சி",
    category: "BITE",
    unitPriceLkr: 3200,
    unitLabel: "Platter",
  },
  {
    id: "bite-cashew-fry",
    name: "Fried Cashew & Green Peas",
    nameSi: "බැදපු කජු සහ ඇට පිඟාන",
    nameTa: "வறுத்த முந்திரி மற்றும் பட்டாணி",
    category: "BITE",
    unitPriceLkr: 4200,
    unitLabel: "Platter",
  },
  {
    id: "bite-pepper-beef",
    name: "Black Pepper Beef Dry Fry",
    nameSi: "ගම්මිරිස් හරක් මස් බැදුම",
    nameTa: "மிளகு மாட்டிறைச்சி வறுவல்",
    category: "BITE",
    unitPriceLkr: 3600,
    unitLabel: "Platter",
  },
  {
    id: "bite-fries",
    name: "Crispy French Fries Basket",
    nameSi: "ප්රංශ ෆ්රයිස් බඳුන",
    nameTa: "பிரெஞ்சு பொரியல் கூடை",
    category: "BITE",
    unitPriceLkr: 1500,
    unitLabel: "Basket",
  },
  {
    id: "chaser-egb",
    name: "Elephant House Ginger Beer (EGB)",
    nameSi: "ඇලිෆන්ට් හවුස් ඉඟුරු බියර් (EGB)",
    nameTa: "எலிஃபென்ட் ஹவுஸ் இஞ்சி பீர்",
    category: "CHASER",
    unitPriceLkr: 450,
    unitLabel: "Can 330ml",
  },
  {
    id: "chaser-soda",
    name: "Lion Club Soda",
    nameSi: "ලයින් ක්ලබ් සෝඩා",
    nameTa: "சோடா பாட்டில்",
    category: "CHASER",
    unitPriceLkr: 350,
    unitLabel: "Bottle 330ml",
  },
  {
    id: "chaser-coke",
    name: "Coca-Cola Original",
    nameSi: "කොකා-කෝලා බීම",
    nameTa: "கோகோ கோலா",
    category: "CHASER",
    unitPriceLkr: 400,
    unitLabel: "Bottle 330ml",
  },
  {
    id: "chaser-tonic",
    name: "Schweppes Tonic Water",
    nameSi: "ටොනික් වතුර කෑන්",
    nameTa: "டானிக் வாட்டர்",
    category: "CHASER",
    unitPriceLkr: 550,
    unitLabel: "Can 330ml",
  },
  {
    id: "chaser-ice-bucket",
    name: "Large Ice Bucket & Tongs",
    nameSi: "අයිස් බාල්දිය (අඬු සහිත)",
    nameTa: "பெரிய பனி வாளி",
    category: "CHASER",
    unitPriceLkr: 600,
    unitLabel: "Bucket",
  },
];

export const DEFAULT_BANQUET_ORDERS: readonly BanquetExtraOrder[] = [
  {
    id: "ord-001",
    itemId: "bite-hbc",
    itemName: "Hot Butter Cuttlefish (HBC)",
    category: "BITE",
    quantity: 2,
    unitPriceLkr: 3800,
    totalPriceLkr: 7600,
    tableRef: "Head Table",
    status: "SERVED",
    orderedAtIso: "2026-10-25T19:45:00.000Z",
  },
  {
    id: "ord-002",
    itemId: "chaser-egb",
    itemName: "Elephant House Ginger Beer (EGB)",
    category: "CHASER",
    quantity: 6,
    unitPriceLkr: 450,
    totalPriceLkr: 2700,
    tableRef: "VIP Lounge",
    status: "SERVED",
    orderedAtIso: "2026-10-25T20:00:00.000Z",
  },
];

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function computeOverflowStatus(
  issuedPax: number,
  guaranteedPax: number,
  bufferPax: number,
): OverflowStatus {
  const safeIssued = Math.max(0, issuedPax);
  const safeGuaranteed = Math.max(0, guaranteedPax);
  const safeBuffer = Math.max(0, bufferPax);

  if (safeIssued > safeGuaranteed + safeBuffer) {
    return "BUFFER_EXCEEDED";
  }
  if (safeIssued > safeGuaranteed) {
    return "EXTRA_PAX_BUFFER";
  }
  return "WITHIN_GUARANTEE";
}

export function computeBanquetFinancials(
  guaranteedPax: number,
  issuedPax: number,
  ratePerPlateLkr: number,
  extraOrders: readonly BanquetExtraOrder[],
): BanquetSettlementSummary {
  const safeGuaranteed = Math.max(0, guaranteedPax);
  const safeIssued = Math.max(0, issuedPax);
  const safeRate = Math.max(0, ratePerPlateLkr);

  const basePlateTotalLkr = safeGuaranteed * safeRate;
  const extraPax = Math.max(0, safeIssued - safeGuaranteed);
  const extraPaxAmountLkr = extraPax * safeRate;

  let extraBitesTotalLkr = 0;
  let extraChasersTotalLkr = 0;

  for (const order of extraOrders) {
    if (order.category === "BITE") {
      extraBitesTotalLkr += order.totalPriceLkr;
    } else {
      extraChasersTotalLkr += order.totalPriceLkr;
    }
  }

  const grossSubtotalLkr =
    basePlateTotalLkr + extraPaxAmountLkr + extraBitesTotalLkr + extraChasersTotalLkr;

  // Sri Lankan statutory 4-stage tax compounding
  const serviceChargeLkr = Math.round(grossSubtotalLkr * 0.1);
  const subtotalAfterSc = grossSubtotalLkr + serviceChargeLkr;

  const tdlLkr = Math.round(subtotalAfterSc * 0.01);
  const ssclLkr = Math.round(subtotalAfterSc * 0.025);

  const vatBase = subtotalAfterSc + tdlLkr + ssclLkr;
  const vatLkr = Math.round(vatBase * 0.18);

  const grandTotalLkr = vatBase + vatLkr;

  return {
    guaranteedPax: safeGuaranteed,
    issuedPax: safeIssued,
    extraPax,
    ratePerPlateLkr: safeRate,
    basePlateTotalLkr,
    extraPaxAmountLkr,
    extraBitesTotalLkr,
    extraChasersTotalLkr,
    grossSubtotalLkr,
    serviceChargeLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    grandTotalLkr,
  };
}

export function formatLkrAmount(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `LKR ${safeAmount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBanquetServiceTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  const hh = hrs.toString().padStart(2, "0");
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

export function generateBanquetThermalSlip(
  event: BanquetEventSummary,
  issuedPax: number,
  extraOrders: readonly BanquetExtraOrder[],
  financials: BanquetSettlementSummary,
  timestampIso: string,
): string {
  const border = "========================================";
  const divider = "----------------------------------------";

  const orderLines = extraOrders
    .map(
      (ord) =>
        `${ord.quantity.toString().padEnd(3)} ${ord.itemName.slice(0, 22).padEnd(23)} ${formatLkrAmount(ord.totalPriceLkr).padStart(12)}`,
    )
    .join("\n");

  return [
    border,
    " SRI LANKAN CLOUD HMS - BANQUET POS ",
    " LIVE PLATE RECONCILIATION SLIP ",
    border,
    `BEO Function: ${event.functionNumber}`,
    `Event ID: ${event.eventId}`,
    `Client: ${event.clientName}`,
    `Hall / Venue: ${event.hallName}`,
    `Captain: ${event.captainName}`,
    `Timestamp: ${timestampIso.replace("T", " ").slice(0, 19)}`,
    divider,
    "PLATE ATTENDANCE SUMMARY",
    `Guaranteed Pax: ${event.guaranteedPax.toString().padStart(16)}`,
    `Actual Plates Issued: ${issuedPax.toString().padStart(16)}`,
    `Kitchen Buffer Pax: ${event.bufferPax.toString().padStart(16)}`,
    `Extra Pax Overflow: ${financials.extraPax.toString().padStart(16)}`,
    `Plate Tariff Rate: ${formatLkrAmount(event.ratePerPlateLkr).padStart(16)}`,
    `Extra Pax Surcharge: ${formatLkrAmount(financials.extraPaxAmountLkr).padStart(16)}`,
    divider,
    "EXTRA BITES & CHASERS ORDERED",
    orderLines || "No extra bites/chasers ordered.",
    divider,
    "FINANCIAL SETTLEMENT BREAKDOWN",
    `Base Guaranteed Cost: ${formatLkrAmount(financials.basePlateTotalLkr).padStart(16)}`,
    `Extra Pax Overflow: ${formatLkrAmount(financials.extraPaxAmountLkr).padStart(16)}`,
    `Extra Bites Total: ${formatLkrAmount(financials.extraBitesTotalLkr).padStart(16)}`,
    `Extra Chasers Total: ${formatLkrAmount(financials.extraChasersTotalLkr).padStart(16)}`,
    `Gross Food & Beverage:${formatLkrAmount(financials.grossSubtotalLkr).padStart(16)}`,
    `10% Service Charge: ${formatLkrAmount(financials.serviceChargeLkr).padStart(16)}`,
    `1% TDL Levy: ${formatLkrAmount(financials.tdlLkr).padStart(16)}`,
    `2.5% SSCL Tax: ${formatLkrAmount(financials.ssclLkr).padStart(16)}`,
    `18% VAT Tax: ${formatLkrAmount(financials.vatLkr).padStart(16)}`,
    divider,
    `GRAND TOTAL SETTLEMENT:${formatLkrAmount(financials.grandTotalLkr).padStart(15)}`,
    border,
    "",
    "Captain Signature: ___________________",
    "",
    "Host/Client Sign: ___________________",
    border,
  ].join("\n");
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface LivePlateCounterTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly guaranteedPax: string;
  readonly issuedPax: string;
  readonly extraPax: string;
  readonly bufferPax: string;
  readonly remainingWithinBuffer: string;
  readonly addOnePlate: string;
  readonly addFivePlates: string;
  readonly addTenPlates: string;
  readonly minusOnePlate: string;
  readonly stationSelect: string;
  readonly quickBitesTitle: string;
  readonly quickBitesTab: string;
  readonly quickChasersTab: string;
  readonly tableRefPlaceholder: string;
  readonly dispatchOrder: string;
  readonly liveOrdersTitle: string;
  readonly noOrdersYet: string;
  readonly markServed: string;
  readonly served: string;
  readonly settlementTitle: string;
  readonly syncSettlementButton: string;
  readonly printThermalSlipButton: string;
  readonly auditLogTitle: string;
  readonly screenAwakeActive: string;
  readonly screenAwakeInactive: string;
  readonly soundAlertsActive: string;
  readonly soundAlertsMuted: string;
  readonly offlinePendingBadge: string;
  readonly liveSyncedBadge: string;
  readonly withinGuaranteeBadge: string;
  readonly extraPaxWarningBadge: string;
  readonly bufferExceededAlertBadge: string;
  readonly timerRunning: string;
  readonly timerPaused: string;
  readonly resetTimer: string;
}

export const LIVE_PLATE_TRANSLATIONS: Readonly<
  Record<SupportedLanguage, LivePlateCounterTranslations>
> = {
  en: {
    title: "Event-Day Live Plate Counter & Extra Pax Tracker",
    subtitle: "Real-time banquet plate count, extra pax billing & instant bites ordering",
    guaranteedPax: "Guaranteed Pax",
    issuedPax: "Actual Plates Issued",
    extraPax: "Extra Pax Overflow",
    bufferPax: "Kitchen Buffer",
    remainingWithinBuffer: "Remaining Buffer Plates",
    addOnePlate: "+1 Plate",
    addFivePlates: "+5 Plates",
    addTenPlates: "+10 Plates",
    minusOnePlate: "-1 Correction",
    stationSelect: "Buffet Station",
    quickBitesTitle: "Instant Bites & Chasers Dispatch",
    quickBitesTab: "Devilled Bites",
    quickChasersTab: "Chasers & Ice",
    tableRefPlaceholder: "Table / Location (e.g. Table 08, VIP Lounge)",
    dispatchOrder: "Dispatch KOT",
    liveOrdersTitle: "Live Extra Orders During Dinner",
    noOrdersYet: "No extra bites or chaser platters dispatched yet.",
    markServed: "Mark Served",
    served: "Served",
    settlementTitle: "Live Banquet Settlement Invoice",
    syncSettlementButton: "Sync to Final Settlement Invoice",
    printThermalSlipButton: "Print 80mm Verification Slip",
    auditLogTitle: "Plate Increment Audit Trail",
    screenAwakeActive: "Screen Kept Awake",
    screenAwakeInactive: "Auto-Lock Normal",
    soundAlertsActive: "Sound On",
    soundAlertsMuted: "Muted",
    offlinePendingBadge: "Offline Queue",
    liveSyncedBadge: "Live Synced",
    withinGuaranteeBadge: "Within Guarantee",
    extraPaxWarningBadge: "Extra Pax Overflow",
    bufferExceededAlertBadge: "Kitchen Buffer Exceeded!",
    timerRunning: "Service Timer",
    timerPaused: "Timer Paused",
    resetTimer: "Reset Timer",
  },
  si: {
    title: "සජීවී උත්සව පිඟන් ගණකය සහ අතිරේක අමුත්තන් සටහන",
    subtitle: "නියමිත පිඟන් සංඛ්යාව, අතිරේක අයවීම් සහ ක්ෂණික බයිට්ස් ඇණවුම් කිරීම",
    guaranteedPax: "සහතික කළ අමුත්තන්",
    issuedPax: "නිකුත් කළ මුළු පිඟන්",
    extraPax: "අතිරේක අමුත්තන්",
    bufferPax: "කුස්සියේ අතිරේක සංචිතය",
    remainingWithinBuffer: "ඉතිරි සංචිත පිඟන්",
    addOnePlate: "+1 පිඟාන",
    addFivePlates: "+5 පිඟන්",
    addTenPlates: "+10 පිඟන්",
    minusOnePlate: "-1 නිවැරදි කිරීම",
    stationSelect: "බුෆේ පේළිය",
    quickBitesTitle: "ක්ෂණික බයිට්ස් සහ බීම ඇණවුම්",
    quickBitesTab: "ඩෙවිල්ඩ් බයිට්ස්",
    quickChasersTab: "බීම සහ අයිස්",
    tableRefPlaceholder: "මේස අංකය (උදා: මේසය 08, ප්රභූ අසුන්)",
    dispatchOrder: "ඇණවුම යවන්න (KOT)",
    liveOrdersTitle: "රාත්රී භෝජන සංග්රහයේ අතිරේක ඇණවුම්",
    noOrdersYet: "තවමත් අතිරේක බයිට්ස් හෝ බීම ඇණවුම් කර නැත.",
    markServed: "පිළිගැන්වූ බව සටහන් කරන්න",
    served: "පිළිගන්වන ලදී",
    settlementTitle: "සජීවී උත්සව අවසන් බිල්පත",
    syncSettlementButton: "අවසාන බිල්පතට යොමු කරන්න",
    printThermalSlipButton: "මි.මී. 80 කුවිතාන්සිය මුද්රණය",
    auditLogTitle: "පිඟන් ගණන් කිරීමේ ඉතිහාසය",
    screenAwakeActive: "තිරය නොනිවේ",
    screenAwakeInactive: "සාමාන්ය තිරය",
    soundAlertsActive: "ශබ්ද සක්රීයයි",
    soundAlertsMuted: "නිහඬයි",
    offlinePendingBadge: "නොබැඳි පෙළගැස්ම",
    liveSyncedBadge: "සජීවීව යාවත්කාලීනයි",
    withinGuaranteeBadge: "සහතික සීමාව තුළ",
    extraPaxWarningBadge: "අතිරේක අමුත්තන්ගේ අයවීම්",
    bufferExceededAlertBadge: "කුස්සියේ සංචිතය ඉක්මවා ඇත!",
    timerRunning: "සේවා කාලය",
    timerPaused: "කාල ගණකය නතරයි",
    resetTimer: "නැවත මුල සිට",
  },
  ta: {
    title: "நிகழ்வு நேரடி தட்டு எண்ணி & கூடுதல் விருந்தினர் கண்காணிப்பு",
    subtitle: "உத்தரவாத தட்டுகள், கூடுதல் விருந்தினர் கட்டணம் மற்றும் உடனடி பைட்ஸ்",
    guaranteedPax: "உறுதியளிக்கப்பட்டோர்",
    issuedPax: "வழங்கப்பட்ட தட்டுகள்",
    extraPax: "கூடுதல் விருந்தினர்",
    bufferPax: "சமையலறை சேமிப்பு",
    remainingWithinBuffer: "மீதமுள்ள சேமிப்பு",
    addOnePlate: "+1 தட்டு",
    addFivePlates: "+5 தட்டுகள்",
    addTenPlates: "+10 தட்டுகள்",
    minusOnePlate: "-1 திருத்தம்",
    stationSelect: "பஃபே பிரிவு",
    quickBitesTitle: "உடனடி பைட்ஸ் & குளிர்பானங்கள்",
    quickBitesTab: "டெவில்ட் பைட்ஸ்",
    quickChasersTab: "குளிர்பானம் & பனி",
    tableRefPlaceholder: "மேஜை குறிப்பு (எ.கா: மேஜை 08, விஐபி)",
    dispatchOrder: "ஆர்டர் அனுப்புக (KOT)",
    liveOrdersTitle: "இரவு விருந்தின் நேரடி கூடுதல் ஆர்டர்கள்",
    noOrdersYet: "கூடுதல் ஆர்டர்கள் எதுவும் இல்லை.",
    markServed: "பரிமாறப்பட்டது என குறி",
    served: "பரிமாறப்பட்டது",
    settlementTitle: "நேரடி இறுதி கட்டணப்பட்டியல்",
    syncSettlementButton: "இறுதிப்பட்டியலுக்கு ஒத்திசை",
    printThermalSlipButton: "80 மிமீ சீட்டு அச்சிடுக",
    auditLogTitle: "தட்டு எண்ணிக்கை தணிக்கை",
    screenAwakeActive: "திரை விழித்திருக்கிறது",
    screenAwakeInactive: "சாதாரண திரை",
    soundAlertsActive: "ஒலி இயக்கத்தில்",
    soundAlertsMuted: "ஒலி முடக்கப்பட்டது",
    offlinePendingBadge: "ஆஃப்லைன் வரிசை",
    liveSyncedBadge: "ஒத்திசைக்கப்பட்டது",
    withinGuaranteeBadge: "உத்தரவாத எல்லைக்குள்",
    extraPaxWarningBadge: "கூடுதல் விருந்தினர் எச்சரிக்கை",
    bufferExceededAlertBadge: "சமையலறை சேமிப்பு தாண்டியது!",
    timerRunning: "சேவை நேரம்",
    timerPaused: "நேரம் நிறுத்தப்பட்டது",
    resetTimer: "மீட்டமை",
  },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface PlateCounterHeaderProps {
  readonly event: BanquetEventSummary;
  readonly t: LivePlateCounterTranslations;
  readonly elapsedSeconds: number;
  readonly isTimerRunning: boolean;
  readonly onToggleTimer: () => void;
  readonly onResetTimer: () => void;
  readonly isWakeLockActive: boolean;
  readonly onToggleWakeLock: () => void;
  readonly isMuted: boolean;
  readonly onToggleMute: () => void;
  readonly offlineQueueCount: number;
}

const PlateCounterHeader: FC<PlateCounterHeaderProps> = ({
  event,
  t,
  elapsedSeconds,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  isWakeLockActive,
  onToggleWakeLock,
  isMuted,
  onToggleMute,
  offlineQueueCount,
}) => {
  return (
    <header className="p-4 sm:p-6 rounded-[24px] bg-white text-slate-900 border border-slate-800 shadow-xl backdrop-blur-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 border border-amber-500/30">
              {event.functionNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {event.hallName}
            </span>
            {offlineQueueCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 border border-amber-500/40 animate-pulse">
                {t.offlinePendingBadge}: {offlineQueueCount}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-ping" />
                {t.liveSyncedBadge}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {event.clientName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {event.captainName} • {event.eventDate}
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Service Elapsed Timer */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-[16px] border border-slate-700">
            <span className="text-xs text-slate-400 font-medium">{t.timerRunning}:</span>
            <span className="text-sm font-bold font-mono text-[#0B6E4F] tabular-nums">
              {formatBanquetServiceTimer(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={onToggleTimer}
              className="px-2 py-1 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title={isTimerRunning ? "Pause" : "Play"}
            >
              {isTimerRunning ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              onClick={onResetTimer}
              className="px-2 py-1 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title={t.resetTimer}
            >
              ↺
            </button>
          </div>

          {/* Wake Lock Toggle */}
          <button
            type="button"
            onClick={onToggleWakeLock}
            className={`min-h-[44px] px-3 py-2 rounded-[16px] text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              isWakeLockActive
                ? "bg-[#34C759]/20 text-[#34C759] border-[#34C759]/40"
                : "bg-slate-100 text-slate-400 border-slate-700 hover:text-slate-900"
            }`}
          >
            <span>{isWakeLockActive ? "Light" : "Sleep"}</span>
            <span>{isWakeLockActive ? t.screenAwakeActive : t.screenAwakeInactive}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`min-h-[44px] px-3 py-2 rounded-[16px] text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              !isMuted
                ? "bg-sky-500/20 text-sky-800 border-sky-500/40"
                : "bg-slate-100 text-slate-400 border-slate-700 hover:text-slate-900"
            }`}
          >
            <span>
              <DynamicTokenIcon token={!isMuted ? "Bell" : "Muted"} />
            </span>
            <span>{!isMuted ? t.soundAlertsActive : t.soundAlertsMuted}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface PlateCounterKpisProps {
  readonly event: BanquetEventSummary;
  readonly issuedPax: number;
  readonly status: OverflowStatus;
  readonly t: LivePlateCounterTranslations;
  readonly financials: BanquetSettlementSummary;
}

const PlateCounterKpis: FC<PlateCounterKpisProps> = ({
  event,
  issuedPax,
  status,
  t,
  financials,
}) => {
  const remainingBuffer = Math.max(0, event.guaranteedPax + event.bufferPax - issuedPax);

  const getStatusColorConfig = () => {
    if (status === "BUFFER_EXCEEDED") {
      return {
        cardBorder: "border-[#FF3B30] bg-[#FF3B30]/10",
        badgeBg: "bg-[#FF3B30] text-slate-900",
        badgeLabel: t.bufferExceededAlertBadge,
        textColor: "text-[#FF3B30]",
      };
    }
    if (status === "EXTRA_PAX_BUFFER") {
      return {
        cardBorder: "border-[#FF9500] bg-[#FF9500]/10",
        badgeBg: "bg-[#FF9500] text-slate-900",
        badgeLabel: t.extraPaxWarningBadge,
        textColor: "text-[#FF9500]",
      };
    }
    return {
      cardBorder: "border-[#34C759] bg-[#34C759]/10",
      badgeBg: "bg-[#34C759] text-slate-900",
      badgeLabel: t.withinGuaranteeBadge,
      textColor: "text-[#34C759]",
    };
  };

  const statusConfig = getStatusColorConfig();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Guaranteed Pax */}
      <div className="p-4 rounded-[20px] bg-white border border-slate-800 backdrop-blur-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t.guaranteedPax}
        </span>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
          {event.guaranteedPax}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {formatLkrAmount(event.ratePerPlateLkr)} / pax
        </p>
      </div>

      {/* 2. Actual Plates Issued */}
      <div
        className={`p-4 rounded-[20px] border backdrop-blur-xl transition-all shadow-lg ${statusConfig.cardBorder}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {t.issuedPax}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig.badgeBg}`}
          >
            {statusConfig.badgeLabel}
          </span>
        </div>
        <div
          className={`text-3xl sm:text-4xl font-black mt-1 tabular-nums ${statusConfig.textColor}`}
        >
          {issuedPax}
        </div>
        <p className="text-xs text-slate-700 mt-1">
          {Math.round((issuedPax / event.guaranteedPax) * 100)}% of commitment
        </p>
      </div>

      {/* 3. Extra Pax Overflow */}
      <div
        className={`p-4 rounded-[20px] bg-white border backdrop-blur-xl ${
          financials.extraPax > 0 ? "border-[#FF3B30]/60 bg-[#FF3B30]/5" : "border-slate-800"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t.extraPax}
        </span>
        <div
          className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${
            financials.extraPax > 0 ? "text-[#FF3B30]" : "text-slate-400"
          }`}
        >
          {financials.extraPax > 0 ? `+${financials.extraPax}` : "0"}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {financials.extraPax > 0 ? formatLkrAmount(financials.extraPaxAmountLkr) : "No surcharge"}
        </p>
      </div>

      {/* 4. Kitchen Buffer Pax */}
      <div className="p-4 rounded-[20px] bg-white border border-slate-800 backdrop-blur-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t.bufferPax}
        </span>
        <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1 tabular-nums">
          +{event.bufferPax}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {t.remainingWithinBuffer}: <strong className="text-slate-900">{remainingBuffer}</strong>
        </p>
      </div>
    </div>
  );
};

interface PlateActionButtonsProps {
  readonly t: LivePlateCounterTranslations;
  readonly selectedStation: string;
  readonly onSelectStation: (station: string) => void;
  readonly onIncrement: (delta: number) => void;
}

const STATIONS: readonly string[] = [
  "Buffet Line 1 (Main Hall)",
  "Buffet Line 2 (Garden Terrace)",
  "Head Table (Bridal)",
  "VIP Enclosure",
];

const PlateActionButtons: FC<PlateActionButtonsProps> = ({
  t,
  selectedStation,
  onSelectStation,
  onIncrement,
}) => {
  return (
    <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t.stationSelect}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATIONS.map((station) => (
            <button
              key={station}
              type="button"
              onClick={() => onSelectStation(station)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedStation === station
                  ? "bg-blue-600 text-white shadow-md font-semibold"
                  : "bg-slate-100 text-slate-400 hover:text-slate-900"
              }`}
            >
              {station}
            </button>
          ))}
        </div>
      </div>

      {/* Large 1-Tap Touch Buttons >= 44x44pt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onIncrement(1)}
          className="min-h-[64px] sm:min-h-[72px] px-4 py-3 rounded-[20px] bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-lg sm:text-xl flex flex-col items-center justify-center shadow-lg transition-transform"
        >
          <span>{t.addOnePlate}</span>
          <span className="text-xs font-normal opacity-80">+1 Pax</span>
        </button>

        <button
          type="button"
          onClick={() => onIncrement(5)}
          className="min-h-[64px] sm:min-h-[72px] px-4 py-3 rounded-[20px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-lg sm:text-xl flex flex-col items-center justify-center shadow-lg transition-transform"
        >
          <span>{t.addFivePlates}</span>
          <span className="text-xs font-normal opacity-80">+5 Pax</span>
        </button>

        <button
          type="button"
          onClick={() => onIncrement(10)}
          className="min-h-[64px] sm:min-h-[72px] px-4 py-3 rounded-[20px] bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-lg sm:text-xl flex flex-col items-center justify-center shadow-lg transition-transform"
        >
          <span>{t.addTenPlates}</span>
          <span className="text-xs font-normal opacity-80">+10 Pax</span>
        </button>

        <button
          type="button"
          onClick={() => onIncrement(-1)}
          className="min-h-[64px] sm:min-h-[72px] px-4 py-3 rounded-[20px] bg-rose-950/80 hover:bg-rose-900 border border-rose-800 active:scale-95 text-rose-800 font-extrabold text-sm sm:text-base flex flex-col items-center justify-center transition-transform"
        >
          <span>{t.minusOnePlate}</span>
          <span className="text-xs font-normal opacity-70">Undo / -1</span>
        </button>
      </div>
    </div>
  );
};

interface ExtraOrdersQuickOrderProps {
  readonly t: LivePlateCounterTranslations;
  readonly catalog: readonly BanquetExtraItem[];
  readonly language: SupportedLanguage;
  readonly onOrderExtra: (item: BanquetExtraItem, tableRef: string) => void;
}

const ExtraOrdersQuickOrder: FC<ExtraOrdersQuickOrderProps> = ({
  t,
  catalog,
  language,
  onOrderExtra,
}) => {
  const [activeTab, setActiveTab] = useState<ExtraItemCategory>("BITE");
  const [customTableRef, setCustomTableRef] = useState("Table 01");

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => item.category === activeTab);
  }, [catalog, activeTab]);

  const getItemName = (item: BanquetExtraItem): string => {
    if (language === "si") return item.nameSi;
    if (language === "ta") return item.nameTa;
    return item.name;
  };

  return (
    <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">{t.quickBitesTitle}</h2>
          <p className="text-xs text-slate-400">1-tap kitchen & bar dispatch during function</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("BITE")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "BITE"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.quickBitesTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CHASER")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "CHASER"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.quickChasersTab}
          </button>
        </div>
      </div>

      {/* Target Table Selector */}
      <div className="flex items-center gap-2 mb-4">
        <label
          htmlFor="quick-table-input"
          className="text-xs text-slate-400 font-medium whitespace-nowrap"
        >
          {t.tableRefPlaceholder}:
        </label>
        <input
          id="quick-table-input"
          type="text"
          value={customTableRef}
          onChange={(e) => setCustomTableRef(e.target.value)}
          className="bg-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 flex-1 max-w-xs"
        />
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCatalog.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-[16px] bg-slate-100 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-sm font-bold text-slate-900">{getItemName(item)}</div>
              <div className="text-xs font-semibold text-[#0B6E4F] tabular-nums">
                {formatLkrAmount(item.unitPriceLkr)}
                <span className="text-slate-400 font-normal"> / {item.unitLabel}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOrderExtra(item, customTableRef || "General Hall")}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all whitespace-nowrap"
            >
              <span>+1</span>
              <span>{t.dispatchOrder}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ExtraOrdersTableProps {
  readonly t: LivePlateCounterTranslations;
  readonly orders: readonly BanquetExtraOrder[];
  readonly onToggleStatus: (orderId: string) => void;
}

const ExtraOrdersTable: FC<ExtraOrdersTableProps> = ({ t, orders, onToggleStatus }) => {
  if (orders.length === 0) {
    return (
      <div className="p-4 rounded-[20px] bg-white border border-slate-800 text-center text-xs text-slate-400">
        {t.noOrdersYet}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800 backdrop-blur-xl shadow-xl">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
        {t.liveOrdersTitle} ({orders.length})
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="p-3 rounded-[14px] bg-slate-100 border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-bold bg-slate-700 text-amber-800">
                x{ord.quantity}
              </span>
              <div>
                <span className="font-semibold text-slate-900">{ord.itemName}</span>
                <span className="text-slate-400 ml-2">({ord.tableRef})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-[#0B6E4F] tabular-nums">
                {formatLkrAmount(ord.totalPriceLkr)}
              </span>
              <button
                type="button"
                onClick={() => onToggleStatus(ord.id)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                  ord.status === "SERVED"
                    ? "bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40"
                    : "bg-amber-500/20 text-amber-800 border border-amber-500/40 hover:bg-amber-500/30"
                }`}
              >
                {ord.status === "SERVED" ? `OK ${t.served}` : t.markServed}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SettlementInvoiceCardProps {
  readonly t: LivePlateCounterTranslations;
  readonly financials: BanquetSettlementSummary;
  readonly onSync: () => void;
  readonly onPrint: () => void;
}

const SettlementInvoiceCard: FC<SettlementInvoiceCardProps> = ({
  t,
  financials,
  onSync,
  onPrint,
}) => {
  return (
    <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{t.settlementTitle}</h3>
          <p className="text-xs text-slate-400">
            Real-time automated Sri Lankan statutory tax compounding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <span>{t.printThermalSlipButton}</span>
          </button>
          <button
            type="button"
            onClick={onSync}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
          >
            <span>{t.syncSettlementButton}</span>
          </button>
        </div>
      </div>

      {/* Tabular Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-2 p-3 rounded-[16px] bg-slate-100 border border-slate-800">
          <div className="flex justify-between text-slate-700">
            <span>
              Guaranteed Pax ({financials.guaranteedPax} ×{" "}
              {formatLkrAmount(financials.ratePerPlateLkr)}):
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatLkrAmount(financials.basePlateTotalLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>
              Extra Pax Overflow ({financials.extraPax} ×{" "}
              {formatLkrAmount(financials.ratePerPlateLkr)}):
            </span>
            <span
              className={`font-semibold tabular-nums ${
                financials.extraPax > 0 ? "text-[#FF3B30]" : "text-slate-400"
              }`}
            >
              {formatLkrAmount(financials.extraPaxAmountLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Extra Bites Total:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatLkrAmount(financials.extraBitesTotalLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Extra Chasers Total:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatLkrAmount(financials.extraChasersTotalLkr)}
            </span>
          </div>
        </div>

        <div className="space-y-2 p-3 rounded-[16px] bg-slate-100 border border-slate-800">
          <div className="flex justify-between text-slate-700">
            <span>Gross F&B Subtotal:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatLkrAmount(financials.grossSubtotalLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>10% Service Charge (SC):</span>
            <span className="tabular-nums">{formatLkrAmount(financials.serviceChargeLkr)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>1% Tourism Dev. Levy (TDL):</span>
            <span className="tabular-nums">{formatLkrAmount(financials.tdlLkr)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>2.5% SSCL Tax:</span>
            <span className="tabular-nums">{formatLkrAmount(financials.ssclLkr)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>18% Value Added Tax (VAT):</span>
            <span className="tabular-nums">{formatLkrAmount(financials.vatLkr)}</span>
          </div>
          <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-extrabold text-[#0B6E4F]">
            <span>Final Settlement Grand Total:</span>
            <span className="tabular-nums">{formatLkrAmount(financials.grandTotalLkr)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThermalSlipModalProps {
  readonly isOpen: boolean;
  readonly slipContent: string;
  readonly onClose: () => void;
}

const ThermalSlipModal: FC<ThermalSlipModalProps> = ({ isOpen, slipContent, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="max-w-md w-full bg-white rounded-[24px] border border-slate-800 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-base">80mm POS Verification Slip</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center"
          >
            x
          </button>
        </div>

        <pre className="mt-4 p-4 rounded-[16px] bg-black font-mono text-[11px] text-[#0B6E4F] overflow-y-auto flex-1 whitespace-pre leading-relaxed border border-slate-800">
          {slipContent}
        </pre>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg transition-all"
          >
            Print 80mm Slip Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-700 text-xs font-semibold text-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component: LiveBanquetPlateCounter
// ============================================================================

export const LiveBanquetPlateCounter: FC<LiveBanquetPlateCounterProps> = ({
  initialEvent = DEFAULT_BANQUET_EVENT,
  initialExtraOrders = DEFAULT_BANQUET_ORDERS,
  language = "en",
  isDarkMode = true,
  onSyncSettlement,
  onPrintSlip,
}) => {
  const containerId = useId();

  // State
  const [event] = useState<BanquetEventSummary>(initialEvent);
  const [issuedPax, setIssuedPax] = useState<number>(
    initialEvent.initialIssuedPax ?? initialEvent.guaranteedPax,
  );
  const [selectedStation, setSelectedStation] = useState<string>("Buffet Line 1 (Main Hall)");
  const [extraOrders, setExtraOrders] = useState<readonly BanquetExtraOrder[]>(initialExtraOrders);
  const [plateLogs, setPlateLogs] = useState<readonly PlateCountLogEntry[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [isThermalSlipOpen, setIsThermalSlipOpen] = useState<boolean>(false);

  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Screen Wake-Lock hook
  const wakeLock = useWakeLock({ autoAcquire: false });

  // Sound Alert hook
  const soundAlert = useSoundAlert();

  const t = LIVE_PLATE_TRANSLATIONS[language];

  // Overflow Status
  const overflowStatus = useMemo(() => {
    return computeOverflowStatus(issuedPax, event.guaranteedPax, event.bufferPax);
  }, [issuedPax, event.guaranteedPax, event.bufferPax]);

  // Financial Settlement
  const financials = useMemo(() => {
    return computeBanquetFinancials(
      event.guaranteedPax,
      issuedPax,
      event.ratePerPlateLkr,
      extraOrders,
    );
  }, [event.guaranteedPax, issuedPax, event.ratePerPlateLkr, extraOrders]);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Increment plates handler
  const handleIncrementPlates = useCallback(
    (delta: number) => {
      const newTotal = Math.max(0, issuedPax + delta);
      setIssuedPax(newTotal);

      const logEntry: PlateCountLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestampIso: new Date().toISOString(),
        delta,
        totalAfter: newTotal,
        station: selectedStation,
      };

      setPlateLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

      // Audio feedback
      if (newTotal > event.guaranteedPax) {
        void soundAlert.playBell("URGENT");
      } else {
        void soundAlert.playBell("NEW_ORDER");
      }

      // Offline queue backup
      void enqueueMutation<PlateCountLogEntry>({
        type: "LOG_PLATE_INCREMENT",
        tenantId: "tenant-default",
        payload: logEntry,
        idempotencyKey: `plate-log-${logEntry.id}`,
      }).then((res) => {
        if (!res.success) {
          setOfflineQueueCount((c) => c + 1);
        }
      });
    },
    [issuedPax, selectedStation, event.guaranteedPax, soundAlert],
  );

  // Order Extra Item handler
  const handleOrderExtra = useCallback(
    (item: BanquetExtraItem, tableRef: string) => {
      const newOrder: BanquetExtraOrder = {
        id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        quantity: 1,
        unitPriceLkr: item.unitPriceLkr,
        totalPriceLkr: item.unitPriceLkr,
        tableRef,
        status: "PREPARING",
        orderedAtIso: new Date().toISOString(),
      };

      setExtraOrders((prev) => [newOrder, ...prev]);
      void soundAlert.playBell("NEW_ORDER");

      void enqueueMutation<BanquetExtraOrder>({
        type: "DISPATCH_BANQUET_EXTRA_ORDER",
        tenantId: "tenant-default",
        payload: newOrder,
        idempotencyKey: `extra-ord-${newOrder.id}`,
      }).then((res) => {
        if (!res.success) {
          setOfflineQueueCount((c) => c + 1);
        }
      });
    },
    [soundAlert],
  );

  // Toggle order status handler
  const handleToggleOrderStatus = useCallback((orderId: string) => {
    setExtraOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, status: ord.status === "SERVED" ? "PREPARING" : "SERVED" }
          : ord,
      ),
    );
  }, []);

  // Sync to settlement handler
  const handleSyncSettlement = useCallback(() => {
    const payload: BanquetLiveSettlementPayload = {
      eventId: event.eventId,
      functionNumber: event.functionNumber,
      clientName: event.clientName,
      hallName: event.hallName,
      guaranteedPax: event.guaranteedPax,
      issuedPax,
      extraPax: financials.extraPax,
      settlement: financials,
      extraOrders,
      plateLogs,
      captainName: event.captainName,
      syncedAtIso: new Date().toISOString(),
    };

    onSyncSettlement?.(payload);
    void soundAlert.playBell("PAYMENT_CONFIRMED");

    void enqueueMutation<BanquetLiveSettlementPayload>({
      type: "SYNC_BANQUET_SETTLEMENT",
      tenantId: "tenant-default",
      payload,
      idempotencyKey: `sync-settle-${payload.eventId}-${Date.now()}`,
    }).then((res) => {
      if (!res.success) {
        setOfflineQueueCount((c) => c + 1);
      }
    });
  }, [event, issuedPax, financials, extraOrders, plateLogs, onSyncSettlement, soundAlert]);

  // Slip text calculation
  const thermalSlipText = useMemo(() => {
    return generateBanquetThermalSlip(
      event,
      issuedPax,
      extraOrders,
      financials,
      new Date().toISOString(),
    );
  }, [event, issuedPax, extraOrders, financials]);

  // Print slip handler
  const handleOpenPrintModal = useCallback(() => {
    setIsThermalSlipOpen(true);
    onPrintSlip?.(thermalSlipText);
  }, [thermalSlipText, onPrintSlip]);

  return (
    <div
      id={containerId}
      className={`min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-6 ${
        isDarkMode ? "bg-[#F4F7F5] text-slate-800" : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* 1. Header with Controls & Elapsed Service Timer */}
      <PlateCounterHeader
        event={event}
        t={t}
        elapsedSeconds={elapsedSeconds}
        isTimerRunning={isTimerRunning}
        onToggleTimer={() => setIsTimerRunning((v) => !v)}
        onResetTimer={() => setElapsedSeconds(0)}
        isWakeLockActive={wakeLock.isActive}
        onToggleWakeLock={() => void wakeLock.toggle()}
        isMuted={soundAlert.isMuted}
        onToggleMute={() => soundAlert.setMuted(!soundAlert.isMuted)}
        offlineQueueCount={offlineQueueCount}
      />

      {/* 2. Top Metric KPI Cards (OLED Vibrancy) */}
      <PlateCounterKpis
        event={event}
        issuedPax={issuedPax}
        status={overflowStatus}
        t={t}
        financials={financials}
      />

      {/* 3. Action Buttons & Station Selector (Tactile >= 44x44pt) */}
      <PlateActionButtons
        t={t}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        onIncrement={handleIncrementPlates}
      />

      {/* 4. Instant Extra Bites & Chasers Dispatch Panel */}
      <ExtraOrdersQuickOrder
        t={t}
        catalog={DEFAULT_BANQUET_EXTRA_CATALOG}
        language={language}
        onOrderExtra={handleOrderExtra}
      />

      {/* 5. Live Extra Orders List */}
      <ExtraOrdersTable t={t} orders={extraOrders} onToggleStatus={handleToggleOrderStatus} />

      {/* 6. Live Settlement Invoice Card */}
      <SettlementInvoiceCard
        t={t}
        financials={financials}
        onSync={handleSyncSettlement}
        onPrint={handleOpenPrintModal}
      />

      {/* 7. Thermal Slip Preview Modal */}
      <ThermalSlipModal
        isOpen={isThermalSlipOpen}
        slipContent={thermalSlipText}
        onClose={() => setIsThermalSlipOpen(false)}
      />
    </div>
  );
};
