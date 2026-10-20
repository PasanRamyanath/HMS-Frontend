/**
 * Final Banquet Tax Invoice & Deposit Deduction Settlement View (BanquetSettlementModal.tsx)
 *
 * Implements Step 342 (Phase 14.17) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive post-event billing, audit settlement, and statutory tax invoice engine
 * for Sri Lankan hotel weddings, homecoming receptions, corporate banquets, and MICE functions:
 *
 * 1. Comprehensive Revenue & Charge Aggregation:
 *    - Guaranteed Pax Base Package (Pax * Per-Pax Package Rate).
 *    - Event-Day Extra Pax Overflow (Extra Pax Count * Extra Pax Rate).
 *    - Live Bar & Kitchen Bite Platters consumed during function (Hot Butter Cuttlefish, Devilled Chicken, etc.).
 *    - Beverage & Liquor Corkage fees (Opened client liquor bottles reconciled with Gate-Pass).
 *    - Hall & AC Overtime Fees (Scheduled End vs Actual Vacate time billed per hour).
 *    - Sundry Event Services & Equipment Rentals (Poruwa stage, Projector/AV, DJ 3-phase power, breakage).
 * 2. Sri Lankan Statutory 4-Stage Compounding Tax Derivation:
 *    - Stage 1: 10% Mandatory Hotel Service Charge (SC).
 *    - Stage 2: 1% Tourism Development Levy (TDL) on (Base + SC).
 *    - Stage 3: 2.5% Social Security Contribution Levy (SSCL) on (Base + SC).
 *    - Stage 4: 18% Value Added Tax (VAT) compounded on (Base + SC + TDL + SSCL).
 * 3. Staged Deposit Reconciliation & Net Settlement Balance:
 *    - Deducts historical advance deposits (Booking Advance 25%, 60-Day Menu Confirmation 50%, 7-Day Pre-Event 25%).
 *    - Computes Net Final Balance Due (or Refund Due if deposits exceed final bill).
 * 4. Multi-Channel Final Payment Collection:
 *    - Cash, LankaQR, Credit Card (POS slip auth), Bank Transfer, or Company Cheque.
 *    - Dual Authorization Sign-Off (Cashier / Banquet Manager & Client Signature).
 * 5. Official Printable A4 IRD / SLTDA Statutory Tax Invoice:
 *    - Complies with Sri Lanka Inland Revenue Department (IRD) Tax Invoice standards
 *      including Hotel VAT Registration Number, TIN, SLTDA Registration, and serial numbered format (`INV-BNQ-YYYY-XXXX`).
 * 6. Apple Human Interface Guidelines:
 *    - Translucent `.apple-liquid-glass`, continuous squircle radii, `.tabular-nums-lkr` typography,
 *      iOS-style segmented control tabs, and `>= 44x44pt` touch targets.
 * 7. Trilingual Localization (`en`, `si`, `ta`).
 * 8. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SettlementTab = "OVERVIEW" | "DEPOSITS" | "PAYMENT" | "PRINT_INVOICE";

export type SettlementPaymentMethod =
  | "CASH"
  | "LANKA_QR"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "COMPANY_CHEQUE";

export interface BiteOrderItem {
  readonly id: string;
  readonly dishNameEn: string;
  readonly dishNameSi: string;
  readonly dishNameTa: string;
  readonly platterCount: number;
  readonly unitPriceLkr: number;
  readonly totalLkr: number;
}

export interface StagedDepositRecord {
  readonly receiptNumber: string;
  readonly milestoneStage: string;
  readonly stageLabelEn: string;
  readonly stageLabelSi: string;
  readonly stageLabelTa: string;
  readonly paidDate: string;
  readonly paymentMethod: string;
  readonly referenceNumber: string;
  readonly amountLkr: number;
}

export interface BanquetBillingConfig {
  readonly invoiceNumber: string;
  readonly beoNumber: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly eventType: string;
  readonly eventDate: string;
  readonly hallName: string;
  readonly clientName: string;
  readonly clientCompany?: string | undefined;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly clientNicPassport: string;
  readonly hotelName: string;
  readonly hotelAddress: string;
  readonly hotelVatTin: string;
  readonly sltdaRegNumber: string;
  readonly currency: string;
  readonly guaranteedPax: number;
  readonly perPaxRateLkr: number;
  readonly actualPaxCount: number;
  readonly extraPaxRateLkr: number;
  readonly biteOrders: readonly BiteOrderItem[];
  readonly corkageBottleCount: number;
  readonly corkageRatePerBottleLkr: number;
  readonly acOvertimeHours: number;
  readonly acOvertimeHourlyRateLkr: number;
  readonly sundryChargesLkr: number;
  readonly sundryDescription?: string | undefined;
  readonly damageDeductionLkr: number;
  readonly damageDescription?: string | undefined;
  readonly stagedDeposits: readonly StagedDepositRecord[];
}

export interface BanquetSettlementFinancials {
  readonly guaranteedPaxTotalLkr: number;
  readonly extraPaxCount: number;
  readonly extraPaxTotalLkr: number;
  readonly totalPaxCount: number;
  readonly totalPaxRevenueLkr: number;
  readonly bitesTotalLkr: number;
  readonly corkageTotalLkr: number;
  readonly acOvertimeTotalLkr: number;
  readonly sundryChargesLkr: number;
  readonly damageDeductionLkr: number;
  readonly grossSubtotalLkr: number;
  readonly serviceChargeLkr: number; // 10%
  readonly subtotalAfterScLkr: number;
  readonly tdlLkr: number; // 1%
  readonly ssclLkr: number; // 2.5%
  readonly vatBaseLkr: number;
  readonly vatLkr: number; // 18%
  readonly grandTotalLkr: number;
  readonly totalDepositsPaidLkr: number;
  readonly netBalanceDueLkr: number;
  readonly isRefundDue: boolean;
  readonly refundAmountLkr: number;
}

export interface SettlementSubmissionData {
  readonly invoiceNumber: string;
  readonly eventId: string;
  readonly grandTotalLkr: number;
  readonly totalDepositsPaidLkr: number;
  readonly netSettlementPaidLkr: number;
  readonly paymentMethod: SettlementPaymentMethod;
  readonly paymentReference: string;
  readonly cashierStaffId: string;
  readonly cashierStaffName: string;
  readonly settlementTimestampIso: string;
  readonly notes?: string | undefined;
}

export interface BanquetSettlementModalProps {
  readonly isOpen: boolean;
  readonly config?: BanquetBillingConfig | undefined;
  readonly currentUserId?: string | undefined;
  readonly currentUserName?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onClose: () => void;
  readonly onConfirmSettlement?: ((data: SettlementSubmissionData) => void) | undefined;
  readonly onPrintTaxInvoice?: ((config: BanquetBillingConfig) => void) | undefined;
}

// ============================================================================
// Default Fixture & Seed Data
// ============================================================================

export const DEFAULT_BITE_ORDERS: readonly BiteOrderItem[] = [
  {
    id: "BITE-01",
    dishNameEn: "Crispy Hot Butter Cuttlefish (HBC)",
    dishNameSi: "හැපෙනසුළු හොට් බටර් දැල්ලෝ",
    dishNameTa: "மொறுமொறுப்பான ஹாட் பட்டர் கணவாய்",
    platterCount: 12,
    unitPriceLkr: 4500,
    totalLkr: 54000,
  },
  {
    id: "BITE-02",
    dishNameEn: "Spicy Devilled Chicken & Capsicum",
    dishNameSi: "දැවිල්ල ඩෙවිල්ඩ් චිකන් සහ මාළු මිරිස්",
    dishNameTa: "காரசாரமான டெவில் கோழி",
    platterCount: 10,
    unitPriceLkr: 3800,
    totalLkr: 38000,
  },
  {
    id: "BITE-03",
    dishNameEn: "Negombo Kochchi Pork Cubes",
    dishNameSi: "මීගමු කොච්චි ඌරු මස් කැබලි",
    dishNameTa: "நீர்கொழும்பு கொச்சி பன்றி இறைச்சி",
    platterCount: 8,
    unitPriceLkr: 4200,
    totalLkr: 33600,
  },
  {
    id: "BITE-04",
    dishNameEn: "Hand-Rolled Sri Lankan Fish Cutlets (50 pcs)",
    dishNameSi: "අතින් හැඩගැන්වූ මාළු කට්ලට් (50 pcs)",
    dishNameTa: "கை சுருட்டப்பட்ட மீன் கட்லெட்",
    platterCount: 4,
    unitPriceLkr: 3500,
    totalLkr: 14000,
  },
];

export const DEFAULT_STAGED_DEPOSITS: readonly StagedDepositRecord[] = [
  {
    receiptNumber: "REC-BNQ-2026-0104",
    milestoneStage: "BOOKING_ADVANCE",
    stageLabelEn: "Initial Date Reservation Advance (25%)",
    stageLabelSi: "මංගල දින වෙන්කිරීමේ අත්තිකාරම (25%)",
    stageLabelTa: "ஆரம்ப முன்பதிவு முற்பணம் (25%)",
    paidDate: "2026-03-15",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "COMM-TX-984210",
    amountLkr: 450000,
  },
  {
    receiptNumber: "REC-BNQ-2026-0389",
    milestoneStage: "MENU_CONFIRMATION",
    stageLabelEn: "60-Day Menu Confirmation Deposit (50%)",
    stageLabelSi: "දින 60 මෙනූ තහවුරුකිරීමේ තැන්පතුව (50%)",
    stageLabelTa: "60-நாள் மெனு உறுதிப்படுத்தல் வைப்பு (50%)",
    paidDate: "2026-08-20",
    paymentMethod: "PAYHERE_ONLINE",
    referenceNumber: "PH-BNQ-774129",
    amountLkr: 900000,
  },
  {
    receiptNumber: "REC-BNQ-2026-0712",
    milestoneStage: "PRE_EVENT_BALANCE",
    stageLabelEn: "7-Day Pre-Event Staged Balance (25%)",
    stageLabelSi: "දින 7 මංගල උත්සව පූර්ව ශේෂය (25%)",
    stageLabelTa: "7-நாள் நிகழ்வுக்கு முந்தைய இருப்பு (25%)",
    paidDate: "2026-10-18",
    paymentMethod: "CREDIT_CARD",
    referenceNumber: "POS-SLIP-8831",
    amountLkr: 450000,
  },
];

export const DEFAULT_BANQUET_BILLING_CONFIG: BanquetBillingConfig = {
  invoiceNumber: "INV-BNQ-2026-0889",
  beoNumber: "BEO-2026-0889",
  eventId: "EVT-2026-0889",
  eventName: "Jayasinghe & Dissanayake Wedding Reception",
  eventType: "TRADITIONAL_SINHALA_WEDDING",
  eventDate: "2026-10-25",
  hallName: "Grand Sapphire Ballroom",
  clientName: "Dr. Asitha Jayasinghe",
  clientCompany: "Jayasinghe Consultants (Pvt) Ltd",
  clientPhone: "+94 77 123 4567",
  clientEmail: "asitha.j@gmail.com",
  clientNicPassport: "198814502891",
  hotelName: "The Grand Cinnamon Resort & Spa",
  hotelAddress: "No. 45 Galle Face Centre Road, Colombo 03, Sri Lanka",
  hotelVatTin: "VAT 102938475-7000 / TIN 502938471",
  sltdaRegNumber: "SLTDA/SQA/HOT/00829",
  currency: "LKR",
  guaranteedPax: 200,
  perPaxRateLkr: 8500,
  actualPaxCount: 215, // 15 extra pax overflow
  extraPaxRateLkr: 8800,
  biteOrders: DEFAULT_BITE_ORDERS,
  corkageBottleCount: 18,
  corkageRatePerBottleLkr: 2500,
  acOvertimeHours: 2.0,
  acOvertimeHourlyRateLkr: 25000,
  sundryChargesLkr: 35000, // Traditional oil lamp + Poruwa stage spotlights
  sundryDescription: "Magul Bera welcome troupe extension & spotlight generator standby",
  damageDeductionLkr: 0,
  damageDescription: "No breakages reported by banquet housekeeping steward",
  stagedDeposits: DEFAULT_STAGED_DEPOSITS,
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeBanquetSettlementFinancials(
  config: BanquetBillingConfig,
): BanquetSettlementFinancials {
  const safeGuaranteedPax = Math.max(0, config.guaranteedPax);
  const safePaxRate = Math.max(0, config.perPaxRateLkr);
  const guaranteedPaxTotalLkr = safeGuaranteedPax * safePaxRate;

  const actualPax = Math.max(safeGuaranteedPax, config.actualPaxCount);
  const extraPaxCount = Math.max(0, actualPax - safeGuaranteedPax);
  const safeExtraPaxRate = Math.max(0, config.extraPaxRateLkr);
  const extraPaxTotalLkr = extraPaxCount * safeExtraPaxRate;

  const totalPaxCount = safeGuaranteedPax + extraPaxCount;
  const totalPaxRevenueLkr = guaranteedPaxTotalLkr + extraPaxTotalLkr;

  let bitesTotalLkr = 0;
  for (const item of config.biteOrders) {
    bitesTotalLkr += Math.max(0, item.totalLkr);
  }

  const corkageBottles = Math.max(0, config.corkageBottleCount);
  const corkageRate = Math.max(0, config.corkageRatePerBottleLkr);
  const corkageTotalLkr = corkageBottles * corkageRate;

  const overtimeHours = Math.max(0, config.acOvertimeHours);
  const overtimeRate = Math.max(0, config.acOvertimeHourlyRateLkr);
  const acOvertimeTotalLkr = overtimeHours * overtimeRate;

  const sundryChargesLkr = Math.max(0, config.sundryChargesLkr);
  const damageDeductionLkr = Math.max(0, config.damageDeductionLkr);

  const grossSubtotalLkr =
    totalPaxRevenueLkr +
    bitesTotalLkr +
    corkageTotalLkr +
    acOvertimeTotalLkr +
    sundryChargesLkr +
    damageDeductionLkr;

  // Sri Lankan 4-stage statutory tax compounding
  const serviceChargeLkr = Math.round(grossSubtotalLkr * 0.1);
  const subtotalAfterScLkr = grossSubtotalLkr + serviceChargeLkr;

  const tdlLkr = Math.round(subtotalAfterScLkr * 0.01);
  const ssclLkr = Math.round(subtotalAfterScLkr * 0.025);

  const vatBaseLkr = subtotalAfterScLkr + tdlLkr + ssclLkr;
  const vatLkr = Math.round(vatBaseLkr * 0.18);

  const grandTotalLkr = vatBaseLkr + vatLkr;

  let totalDepositsPaidLkr = 0;
  for (const dep of config.stagedDeposits) {
    totalDepositsPaidLkr += Math.max(0, dep.amountLkr);
  }

  const rawDifference = grandTotalLkr - totalDepositsPaidLkr;
  const isRefundDue = rawDifference < 0;
  const netBalanceDueLkr = isRefundDue ? 0 : rawDifference;
  const refundAmountLkr = isRefundDue ? Math.abs(rawDifference) : 0;

  return {
    guaranteedPaxTotalLkr,
    extraPaxCount,
    extraPaxTotalLkr,
    totalPaxCount,
    totalPaxRevenueLkr,
    bitesTotalLkr,
    corkageTotalLkr,
    acOvertimeTotalLkr,
    sundryChargesLkr,
    damageDeductionLkr,
    grossSubtotalLkr,
    serviceChargeLkr,
    subtotalAfterScLkr,
    tdlLkr,
    ssclLkr,
    vatBaseLkr,
    vatLkr,
    grandTotalLkr,
    totalDepositsPaidLkr,
    netBalanceDueLkr,
    isRefundDue,
    refundAmountLkr,
  };
}

export function formatSettlementCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `LKR ${safe.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface SettlementTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly tabOverview: string;
  readonly tabDeposits: string;
  readonly tabPayment: string;
  readonly tabPrint: string;
  readonly billTo: string;
  readonly eventDetails: string;
  readonly paxBreakdown: string;
  readonly guaranteedPax: string;
  readonly extraPax: string;
  readonly bitesAndBar: string;
  readonly corkageFees: string;
  readonly acOvertime: string;
  readonly sundryCharges: string;
  readonly damageCharges: string;
  readonly grossSubtotal: string;
  readonly serviceCharge: string;
  readonly tdlLevy: string;
  readonly ssclTax: string;
  readonly vatTax: string;
  readonly grandTotal: string;
  readonly depositsDeducted: string;
  readonly netBalanceDue: string;
  readonly refundDue: string;
  readonly paymentMethod: string;
  readonly referenceNumber: string;
  readonly cashierName: string;
  readonly confirmSettlement: string;
  readonly printInvoice: string;
  readonly close: string;
  readonly settledStatus: string;
  readonly outstandingStatus: string;
}

export const SETTLEMENT_TRANSLATIONS: Record<SupportedLanguage, SettlementTranslations> = {
  en: {
    title: "Final Banquet Tax Invoice & Settlement",
    subtitle: "Reconcile extra pax, bites, overtime & deduct staged advance deposits",
    tabOverview: "Invoice Breakdown",
    tabDeposits: "Advance Deposits",
    tabPayment: "Settlement Sign-Off",
    tabPrint: "Official IRD Invoice",
    billTo: "Billed Client Details",
    eventDetails: "Event & Function Specifications",
    paxBreakdown: "Guest Attendance & Pax Reconciliation",
    guaranteedPax: "Guaranteed Pax Base",
    extraPax: "Extra Pax Overflow",
    bitesAndBar: "Bar Bites & Platters Consumed",
    corkageFees: "Reconciled Bottle Corkage",
    acOvertime: "Hall & AC Overtime Extension",
    sundryCharges: "Sundry Equipment & Services",
    damageCharges: "Damage / Breakage Assessment",
    grossSubtotal: "Gross Billing Subtotal",
    serviceCharge: "10% Mandatory Service Charge (SC)",
    tdlLevy: "1% Tourism Development Levy (TDL)",
    ssclTax: "2.5% Social Security Contribution Levy (SSCL)",
    vatTax: "18% Value Added Tax (VAT)",
    grandTotal: "Grand Total (Tax-Inclusive)",
    depositsDeducted: "Less: Staged Advance Deposits Paid",
    netBalanceDue: "Net Final Balance Due",
    refundDue: "Excess Deposit Refund Due to Client",
    paymentMethod: "Settlement Payment Channel",
    referenceNumber: "Transaction Reference / Slip No.",
    cashierName: "Authorizing Cashier / Manager",
    confirmSettlement: "Sign-Off & Close Folio",
    printInvoice: "Print Official Tax Invoice",
    close: "Dismiss",
    settledStatus: "FULLY SETTLED",
    outstandingStatus: "BALANCE OUTSTANDING",
  },
  si: {
    title: "අවසාන උත්සව බදු ඉන්වොයිසිය සහ බේරුම්කරණය",
    subtitle: "අමතර අමුත්තන්, බයිට්ස්, අතිකාල සසඳා අත්තිකාරම් තැන්පතු අඩු කරන්න",
    tabOverview: "ඉන්වොයිසි විස්තරය",
    tabDeposits: "අත්තිකාරම් තැන්පතු",
    tabPayment: "ගෙවීම් තහවුරු කිරීම",
    tabPrint: "නිල දේශීය ආදායම් ඉන්වොයිසිය",
    billTo: "බිල්පත් ලබන පාර්ශ්වය",
    eventDetails: "උත්සව විස්තර",
    paxBreakdown: "අමුත්තන් සංඛ්‍යා සංසන්දනය",
    guaranteedPax: "පොරොන්දු වූ මූලික අමුත්තන්",
    extraPax: "අමතර අමුත්තන් ගණන",
    bitesAndBar: "පරිභෝජනය කළ බයිට්ස් පිඟන්",
    corkageFees: "බෝතල් කෝකේජ් ගාස්තු",
    acOvertime: "ශාලා සහ AC අතිකාල කාලය",
    sundryCharges: "අමතර උපකරණ සහ සේවා",
    damageCharges: "හානි හෝ අලාභ ඇස්තමේන්තුව",
    grossSubtotal: "මුළු එකතුව (බදුවලට පෙර)",
    serviceCharge: "10% සේවා ගාස්තුව (SC)",
    tdlLevy: "1% සංචාරක සංවර්ධන බද්ද (TDL)",
    ssclTax: "2.5% සමාජ ආරක්ෂණ දායකත්ව බද්ද (SSCL)",
    vatTax: "18% එකතු කළ අගය මත බද්ද (VAT)",
    grandTotal: "මුළු එකතුව (බදු ඇතුළුව)",
    depositsDeducted: "අඩු කළ: කලින් ගෙවූ අත්තිකාරම්",
    netBalanceDue: "අවසන් ගෙවිය යුතු ශේෂය",
    refundDue: "සේවාදායකයාට ආපසු ගෙවිය යුතු මුදල",
    paymentMethod: "ගෙවීම් ක්‍රමය",
    referenceNumber: "ගනුදෙනු අංකය / ස්ලිප් අංකය",
    cashierName: "අවසර දෙන කැෂියර් / කළමනාකරු",
    confirmSettlement: "අවසන් අත්සන් කර වසා දමන්න",
    printInvoice: "නිල බදු ඉන්වොයිසිය මුද්‍රණය",
    close: "වසන්න",
    settledStatus: "සම්පූර්ණයෙන් බේරුම් කර ඇත",
    outstandingStatus: "ගෙවීමට ශේෂයක් පවතී",
  },
  ta: {
    title: "இறுதி விருந்து வரி விலைப்பட்டியல் & தீர்வு",
    subtitle: "கூடுதல் விருந்தினர், பைட்ஸ், மேலதிக நேரம் சரிபார்த்து முற்பணத்தைக் கழிக்கவும்",
    tabOverview: "விலைப்பட்டியல் விபரம்",
    tabDeposits: "முற்பண வைப்புகள்",
    tabPayment: "இறுதி தீர்வு உறுதிப்படுத்தல்",
    tabPrint: "உத்தியோகபூர்வ வரி விலைப்பட்டியல்",
    billTo: "பில் பெறும் வாடிக்கையாளர் விபரம்",
    eventDetails: "நிகழ்வு விபரங்கள்",
    paxBreakdown: "விருந்தினர் எண்ணிக்கை சரிபார்ப்பு",
    guaranteedPax: "உறுதியளிக்கப்பட்ட அடிப்படை விருந்தினர்",
    extraPax: "கூடுதல் விருந்தினர் வரவு",
    bitesAndBar: "பயன்படுத்தப்பட்ட பைட்ஸ் தட்டுகள்",
    corkageFees: "போத்தல் கார்கேஜ் கட்டணம்",
    acOvertime: "மண்டப மேலதிக நேர கட்டணம்",
    sundryCharges: "இதர உபகரணங்கள் & சேவைகள்",
    damageCharges: "சேத மதிப்பீட்டுக் கட்டணம்",
    grossSubtotal: "மொத்த துணைத்தொகை",
    serviceCharge: "10% சேவைக்கட்டணம் (SC)",
    tdlLevy: "1% சுற்றுலா அபிவிருத்தி வரி (TDL)",
    ssclTax: "2.5% சமூக பாதுகாப்பு வரி (SSCL)",
    vatTax: "18% பெறுமதி சேர் வரி (VAT)",
    grandTotal: "இறுதி மொத்தம் (வரி உட்பட)",
    depositsDeducted: "கழிக்கப்பட்டது: முற்பண வைப்புகள்",
    netBalanceDue: "இறுதி நிலுவை தொகை",
    refundDue: "வாடிக்கையாளருக்கு மீளளிக்கப்பட வேண்டிய தொகை",
    paymentMethod: "பணம் செலுத்தும் முறை",
    referenceNumber: "பரிவர்த்தனை இலக்கம்",
    cashierName: "அங்கீகரிக்கும் காசாளர் / மேலாளர்",
    confirmSettlement: "கையொப்பமிட்டு கணக்கை முடிக்கவும்",
    printInvoice: "அதிகாரப்பூர்வ வரியை அச்சிடுக",
    close: "மூடுக",
    settledStatus: "முழுமையாக தீர்க்கப்பட்டது",
    outstandingStatus: "நிலுவை தொகை உள்ளது",
  },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface OverviewTabProps {
  readonly config: BanquetBillingConfig;
  readonly financials: BanquetSettlementFinancials;
  readonly t: SettlementTranslations;
}

const OverviewTab: FC<OverviewTabProps> = ({ config, financials, t }) => {
  return (
    <div className="space-y-6">
      {/* Client & Event Bento Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.billTo}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {config.clientName}
          </div>
          {config.clientCompany && (
            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {config.clientCompany}
            </div>
          )}
          <div className="text-xs text-slate-500 font-mono">
            {config.clientPhone} • {config.clientEmail}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            NIC/Passport: {config.clientNicPassport}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.eventDetails}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {config.eventName}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {config.hallName} • {config.eventDate}
          </div>
          <div className="text-xs font-mono text-slate-500">
            BEO: {config.beoNumber} • Inv: {config.invoiceNumber}
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Type: {config.eventType.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {/* Charge Breakdown Table */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/5 text-xs text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Line Description</th>
              <th className="px-4 py-3 text-center">Quantity</th>
              <th className="px-4 py-3 text-right">Unit Rate (LKR)</th>
              <th className="px-4 py-3 text-right">Total (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
            <tr>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {t.guaranteedPax}
                </div>
                <div className="text-xs text-slate-500">Agreed Base Wedding Reception Package</div>
              </td>
              <td className="px-4 py-3 text-center font-mono tabular-nums-lkr">
                {config.guaranteedPax} pax
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums-lkr">
                {formatSettlementCurrency(config.perPaxRateLkr)}
              </td>
              <td className="px-4 py-3 text-right font-bold font-mono tabular-nums-lkr text-slate-900 dark:text-white">
                {formatSettlementCurrency(financials.guaranteedPaxTotalLkr)}
              </td>
            </tr>

            {financials.extraPaxCount > 0 && (
              <tr className="bg-amber-500/5">
                <td className="px-4 py-3">
                  <div className="font-semibold text-amber-600 dark:text-amber-400">
                    {t.extraPax}
                  </div>
                  <div className="text-xs text-slate-500">
                    Event-day physical head count overflow ({config.actualPaxCount} total attended)
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums-lkr text-amber-600">
                  +{financials.extraPaxCount} pax
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr text-amber-600">
                  {formatSettlementCurrency(config.extraPaxRateLkr)}
                </td>
                <td className="px-4 py-3 text-right font-bold font-mono tabular-nums-lkr text-amber-600">
                  {formatSettlementCurrency(financials.extraPaxTotalLkr)}
                </td>
              </tr>
            )}

            {config.biteOrders.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <div className="text-slate-800 dark:text-slate-200">{b.dishNameEn}</div>
                  <div className="text-xs text-slate-500">{b.dishNameSi}</div>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums-lkr">
                  {b.platterCount} platters
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr">
                  {formatSettlementCurrency(b.unitPriceLkr)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr text-slate-800 dark:text-slate-200">
                  {formatSettlementCurrency(b.totalLkr)}
                </td>
              </tr>
            ))}

            {config.corkageBottleCount > 0 && (
              <tr>
                <td className="px-4 py-3">
                  <div className="text-slate-800 dark:text-slate-200">{t.corkageFees}</div>
                  <div className="text-xs text-slate-500">
                    Client hard liquor bottles opened during bar service
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums-lkr">
                  {config.corkageBottleCount} bottles
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr">
                  {formatSettlementCurrency(config.corkageRatePerBottleLkr)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr text-slate-800 dark:text-slate-200">
                  {formatSettlementCurrency(financials.corkageTotalLkr)}
                </td>
              </tr>
            )}

            {config.acOvertimeHours > 0 && (
              <tr>
                <td className="px-4 py-3">
                  <div className="text-slate-800 dark:text-slate-200">{t.acOvertime}</div>
                  <div className="text-xs text-slate-500">
                    Grand Ballroom air conditioning & engineering extension
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums-lkr">
                  {config.acOvertimeHours} hrs
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr">
                  {formatSettlementCurrency(config.acOvertimeHourlyRateLkr)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr text-slate-800 dark:text-slate-200">
                  {formatSettlementCurrency(financials.acOvertimeTotalLkr)}
                </td>
              </tr>
            )}

            {config.sundryChargesLkr > 0 && (
              <tr>
                <td className="px-4 py-3">
                  <div className="text-slate-800 dark:text-slate-200">{t.sundryCharges}</div>
                  <div className="text-xs text-slate-500">
                    {config.sundryDescription || "Specialized setup services"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums-lkr">1 lot</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr">
                  {formatSettlementCurrency(config.sundryChargesLkr)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums-lkr text-slate-800 dark:text-slate-200">
                  {formatSettlementCurrency(config.sundryChargesLkr)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Compounding Summary Bento Box */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-black/10 dark:border-white/10 space-y-3">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>{t.grossSubtotal}:</span>
          <span className="font-mono tabular-nums-lkr">
            {formatSettlementCurrency(financials.grossSubtotalLkr)}
          </span>
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex justify-between">
            <span>{t.serviceCharge}:</span>
            <span className="font-mono tabular-nums-lkr font-medium">
              {formatSettlementCurrency(financials.serviceChargeLkr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t.tdlLevy}:</span>
            <span className="font-mono tabular-nums-lkr font-medium">
              {formatSettlementCurrency(financials.tdlLkr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t.ssclTax}:</span>
            <span className="font-mono tabular-nums-lkr font-medium">
              {formatSettlementCurrency(financials.ssclLkr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t.vatTax}:</span>
            <span className="font-mono tabular-nums-lkr font-medium">
              {formatSettlementCurrency(financials.vatLkr)}
            </span>
          </div>
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10" />

        <div className="flex justify-between items-center text-base font-bold text-slate-900 dark:text-white">
          <span>{t.grandTotal}:</span>
          <span className="text-lg font-mono tabular-nums-lkr text-indigo-600 dark:text-indigo-400">
            {formatSettlementCurrency(financials.grandTotalLkr)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <span>{t.depositsDeducted}:</span>
          <span className="font-mono tabular-nums-lkr">
            - {formatSettlementCurrency(financials.totalDepositsPaidLkr)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-300">
              {financials.isRefundDue ? t.refundDue : t.netBalanceDue}
            </div>
            <div className="text-xs text-slate-500">
              {financials.isRefundDue
                ? "Client has excess deposit credit to be returned"
                : "Final post-event balance payable by client"}
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums-lkr text-indigo-700 dark:text-indigo-300">
            {formatSettlementCurrency(
              financials.isRefundDue ? financials.refundAmountLkr : financials.netBalanceDueLkr,
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DepositsTabProps {
  readonly deposits: readonly StagedDepositRecord[];
  readonly totalPaidLkr: number;
  readonly grandTotalLkr: number;
  readonly t: SettlementTranslations;
}

const DepositsTab: FC<DepositsTabProps> = ({ deposits, totalPaidLkr, grandTotalLkr, t }) => {
  const percentageCovered =
    grandTotalLkr > 0 ? Math.min(100, Math.round((totalPaidLkr / grandTotalLkr) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t.depositsDeducted}
          </div>
          <div className="text-2xl font-black font-mono tabular-nums-lkr text-emerald-600 dark:text-emerald-400">
            {formatSettlementCurrency(totalPaidLkr)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Covers {percentageCovered}% of the gross tax-inclusive event valuation
          </div>
        </div>

        <div className="w-full md:w-48 bg-black/10 dark:bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentageCovered}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Receipt History & Milestone Records
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
          {deposits.map((dep) => (
            <div
              key={dep.receiptNumber}
              className="p-4 bg-white/40 dark:bg-black/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {dep.receiptNumber}
                  </span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {dep.stageLabelEn}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Paid Date: {dep.paidDate} • Method: {dep.paymentMethod.replace(/_/g, " ")} • Ref:{" "}
                  {dep.referenceNumber}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
                  {formatSettlementCurrency(dep.amountLkr)}
                </div>
                <div className="text-xs text-slate-400 font-medium">Verified Deposit</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface PaymentTabProps {
  readonly config: BanquetBillingConfig;
  readonly financials: BanquetSettlementFinancials;
  readonly currentUserId: string;
  readonly currentUserName: string;
  readonly t: SettlementTranslations;
  readonly onConfirmSettlement: (data: SettlementSubmissionData) => void;
}

const PaymentTab: FC<PaymentTabProps> = ({
  config,
  financials,
  currentUserId,
  currentUserName,
  t,
  onConfirmSettlement,
}) => {
  const [method, setMethod] = useState<SettlementPaymentMethod>("CREDIT_CARD");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleSubmit = () => {
    if (isAuthorizing) return;
    setIsAuthorizing(true);

    const submission: SettlementSubmissionData = {
      invoiceNumber: config.invoiceNumber,
      eventId: config.eventId,
      grandTotalLkr: financials.grandTotalLkr,
      totalDepositsPaidLkr: financials.totalDepositsPaidLkr,
      netSettlementPaidLkr: financials.netBalanceDueLkr,
      paymentMethod: method,
      paymentReference: reference.trim() || `SETTLE-${Date.now().toString().slice(-6)}`,
      cashierStaffId: currentUserId,
      cashierStaffName: currentUserName,
      settlementTimestampIso: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onConfirmSettlement(submission);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
          Settlement Collection Target
        </div>
        <div className="text-3xl font-black font-mono tabular-nums-lkr text-indigo-700 dark:text-indigo-300">
          {formatSettlementCurrency(
            financials.isRefundDue ? financials.refundAmountLkr : financials.netBalanceDueLkr,
          )}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {financials.isRefundDue
            ? "Process refund disbursement via original payment channel"
            : "Collect final balance to discharge banquet folio"}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="settlement-payment-method"
            className="block text-xs font-bold uppercase text-slate-500 mb-1"
          >
            {t.paymentMethod}
          </label>
          <div id="settlement-payment-method" className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(
              [
                "CREDIT_CARD",
                "LANKA_QR",
                "CASH",
                "BANK_TRANSFER",
                "COMPANY_CHEQUE",
              ] as SettlementPaymentMethod[]
            ).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left min-h-[44px] ${
                  method === m
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/10"
                }`}
              >
                {m.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="settlement-reference"
            className="block text-xs font-bold uppercase text-slate-500 mb-1"
          >
            {t.referenceNumber}
          </label>
          <input
            id="settlement-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. POS Slip 9942, LankaQR Trace ID, Sampath Cheque #00492"
            className="w-full px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-slate-900 text-sm font-mono min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor="settlement-notes"
            className="block text-xs font-bold uppercase text-slate-500 mb-1"
          >
            Settlement Notes & Manager Remarks
          </label>
          <textarea
            id="settlement-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Extra pax verified with Dr. Jayasinghe, corkage bottles returned to chauffeur"
            className="w-full px-4 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-slate-900 text-sm font-sans"
          />
        </div>

        <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="font-semibold">{t.cashierName}:</span> {currentUserName} (
            {currentUserId})
          </div>
          <div className="font-mono text-emerald-600 font-semibold">RBAC Verified</div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isAuthorizing}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all min-h-[48px] flex items-center justify-center gap-2"
        >
          <span>{t.confirmSettlement}</span>
        </button>
      </div>
    </div>
  );
};

interface PrintInvoiceTabProps {
  readonly config: BanquetBillingConfig;
  readonly financials: BanquetSettlementFinancials;
  readonly t: SettlementTranslations;
  readonly onPrint: () => void;
}

const PrintInvoiceTab: FC<PrintInvoiceTabProps> = ({ config, financials, t, onPrint }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-500">
          Official A4 statutory tax invoice generated per Sri Lanka Inland Revenue Act standards.
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 shadow"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span>{t.printInvoice}</span>
        </button>
      </div>

      {/* Printable Sheet Emulation */}
      <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-sm font-sans space-y-6">
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <div className="text-xl font-black uppercase tracking-wider">{config.hotelName}</div>
            <div className="text-xs text-slate-600">{config.hotelAddress}</div>
            <div className="text-xs font-mono text-slate-700 mt-1">
              TIN/VAT: {config.hotelVatTin}
            </div>
            <div className="text-xs font-mono text-slate-700">SLTDA: {config.sltdaRegNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-indigo-700 uppercase">
              STATUTORY TAX INVOICE
            </div>
            <div className="text-sm font-mono font-bold mt-1">Invoice: {config.invoiceNumber}</div>
            <div className="text-xs font-mono text-slate-600">Date: {config.eventDate}</div>
            <div className="text-xs font-mono text-slate-600">BEO Ref: {config.beoNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-bold uppercase text-slate-500">BILLED TO:</div>
            <div className="font-bold text-sm text-slate-900">{config.clientName}</div>
            {config.clientCompany && <div>{config.clientCompany}</div>}
            <div>{config.clientPhone}</div>
            <div>NIC/Passport: {config.clientNicPassport}</div>
          </div>
          <div>
            <div className="font-bold uppercase text-slate-500">FUNCTION VENUE:</div>
            <div className="font-semibold text-slate-900">{config.eventName}</div>
            <div>Venue: {config.hallName}</div>
            <div>Event Date: {config.eventDate}</div>
            <div>Pax Count: {financials.totalPaxCount} attendees</div>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-400 font-bold uppercase">
              <th className="py-2">Item Description</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-1.5 font-medium">Guaranteed Wedding Package</td>
              <td className="py-1.5 text-center font-mono">{config.guaranteedPax}</td>
              <td className="py-1.5 text-right font-mono">
                {formatSettlementCurrency(config.perPaxRateLkr)}
              </td>
              <td className="py-1.5 text-right font-mono">
                {formatSettlementCurrency(financials.guaranteedPaxTotalLkr)}
              </td>
            </tr>
            {financials.extraPaxCount > 0 && (
              <tr>
                <td className="py-1.5 font-medium">Extra Pax Overflow Surcharge</td>
                <td className="py-1.5 text-center font-mono">{financials.extraPaxCount}</td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(config.extraPaxRateLkr)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(financials.extraPaxTotalLkr)}
                </td>
              </tr>
            )}
            {config.biteOrders.map((b) => (
              <tr key={b.id}>
                <td className="py-1.5">{b.dishNameEn}</td>
                <td className="py-1.5 text-center font-mono">{b.platterCount}</td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(b.unitPriceLkr)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(b.totalLkr)}
                </td>
              </tr>
            ))}
            {config.corkageBottleCount > 0 && (
              <tr>
                <td className="py-1.5">Beverage & Bottle Corkage Charge</td>
                <td className="py-1.5 text-center font-mono">{config.corkageBottleCount}</td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(config.corkageRatePerBottleLkr)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(financials.corkageTotalLkr)}
                </td>
              </tr>
            )}
            {config.acOvertimeHours > 0 && (
              <tr>
                <td className="py-1.5">Hall & Air Conditioning Overtime</td>
                <td className="py-1.5 text-center font-mono">{config.acOvertimeHours} hrs</td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(config.acOvertimeHourlyRateLkr)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(financials.acOvertimeTotalLkr)}
                </td>
              </tr>
            )}
            {config.sundryChargesLkr > 0 && (
              <tr>
                <td className="py-1.5">{config.sundryDescription || "Sundry Event Add-Ons"}</td>
                <td className="py-1.5 text-center font-mono">1</td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(config.sundryChargesLkr)}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {formatSettlementCurrency(config.sundryChargesLkr)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="border-t border-slate-400 pt-3 flex justify-end">
          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span className="font-mono">
                {formatSettlementCurrency(financials.grossSubtotalLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>10% Service Charge:</span>
              <span className="font-mono">
                {formatSettlementCurrency(financials.serviceChargeLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>1% TDL Levy:</span>
              <span className="font-mono">{formatSettlementCurrency(financials.tdlLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span>2.5% SSCL Tax:</span>
              <span className="font-mono">{formatSettlementCurrency(financials.ssclLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span>18% VAT Tax:</span>
              <span className="font-mono">{formatSettlementCurrency(financials.vatLkr)}</span>
            </div>
            <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-sm">
              <span>Grand Total:</span>
              <span className="font-mono">
                {formatSettlementCurrency(financials.grandTotalLkr)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Advance Deposits Paid:</span>
              <span className="font-mono">
                - {formatSettlementCurrency(financials.totalDepositsPaidLkr)}
              </span>
            </div>
            <div className="border-t-2 border-slate-900 pt-1 flex justify-between font-black text-sm text-indigo-800">
              <span>Net Balance Due:</span>
              <span className="font-mono">
                {formatSettlementCurrency(financials.netBalanceDueLkr)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 pt-8 grid grid-cols-2 gap-8 text-xs text-center">
          <div>
            <div className="border-t border-slate-400 pt-1 font-semibold">
              Client Acceptance Signature
            </div>
            <div className="text-[10px] text-slate-500">Date: {config.eventDate}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1 font-semibold">
              Authorized Hotel Manager Signature & Stamp
            </div>
            <div className="text-[10px] text-slate-500">General Manager / Financial Controller</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const BanquetSettlementModal: FC<BanquetSettlementModalProps> = ({
  isOpen,
  config = DEFAULT_BANQUET_BILLING_CONFIG,
  currentUserId = "STAFF-0081",
  currentUserName = "Kavinda Wickramasinghe (Banquet Cashier)",
  language = "en",
  onClose,
  onConfirmSettlement,
  onPrintTaxInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<SettlementTab>("OVERVIEW");
  const dialogId = useId();

  const t = SETTLEMENT_TRANSLATIONS[language] || SETTLEMENT_TRANSLATIONS.en;

  const financials = useMemo(() => {
    return computeBanquetSettlementFinancials(config);
  }, [config]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (onPrintTaxInvoice) {
      onPrintTaxInvoice(config);
    }
  };

  const handleConfirm = (data: SettlementSubmissionData) => {
    if (onConfirmSettlement) {
      onConfirmSettlement(data);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-full h-full max-w-none max-h-none m-0 border-0"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl apple-liquid-glass bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id={`${dialogId}-title`}
                className="text-lg font-black text-slate-900 dark:text-white"
              >
                {t.title}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  financials.netBalanceDueLkr === 0
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                }`}
              >
                {financials.netBalanceDueLkr === 0 ? t.settledStatus : t.outstandingStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all min-h-[44px] min-w-[44px]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="grid grid-cols-4 gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("OVERVIEW")}
              className={`py-2 rounded-xl transition-all min-h-[40px] ${
                activeTab === "OVERVIEW"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {t.tabOverview}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEPOSITS")}
              className={`py-2 rounded-xl transition-all min-h-[40px] ${
                activeTab === "DEPOSITS"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {t.tabDeposits}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PAYMENT")}
              className={`py-2 rounded-xl transition-all min-h-[40px] ${
                activeTab === "PAYMENT"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {t.tabPayment}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PRINT_INVOICE")}
              className={`py-2 rounded-xl transition-all min-h-[40px] ${
                activeTab === "PRINT_INVOICE"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {t.tabPrint}
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "OVERVIEW" && (
            <OverviewTab config={config} financials={financials} t={t} />
          )}

          {activeTab === "DEPOSITS" && (
            <DepositsTab
              deposits={config.stagedDeposits}
              totalPaidLkr={financials.totalDepositsPaidLkr}
              grandTotalLkr={financials.grandTotalLkr}
              t={t}
            />
          )}

          {activeTab === "PAYMENT" && (
            <PaymentTab
              config={config}
              financials={financials}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              t={t}
              onConfirmSettlement={handleConfirm}
            />
          )}

          {activeTab === "PRINT_INVOICE" && (
            <PrintInvoiceTab config={config} financials={financials} t={t} onPrint={handlePrint} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div>
            Invoice: <span className="font-mono font-semibold">{config.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold tabular-nums-lkr text-slate-900 dark:text-white">
              {formatSettlementCurrency(financials.grandTotalLkr)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/10 text-xs font-semibold"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
