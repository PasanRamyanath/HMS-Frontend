/**
 * Banquet Tax Invoice Adapter & Statutory Helpers (banquetInvoiceHelpers.ts)
 *
 * Implements Step 350 (Phase 14.25) / Rung 7 of the Sri Lanka HMS Master Architecture Plan:
 * Reusable adapter bridge mapping banquet billing models and deposit records into
 * the canonical PrintableTaxInvoice component for SLTDA/IRD-compliant A4 billing.
 *
 * Capabilities:
 * 1. Converts BanquetBillingConfig & BanquetSettlementFinancials to PrintableTaxInvoiceProps
 * 2. Decomposes banquet charges into statutory TaxInvoiceLineItem rows with 4-stage tax compounding
 * 3. Maps staged wedding advance deposits (PayHere, Bank Wire, LankaQR) into TaxInvoicePaymentRecord entries
 * 4. Fulfills Inland Revenue Department (IRD) Section 20 tax invoice requirements
 * 5. Strictly zero console noise, cognitive complexity <= 12 per function
 */

import type { SupportedLanguage } from "../../lib/i18n.js";
import type {
  TaxInvoiceGuestProfile,
  TaxInvoiceHotelProfile,
  TaxInvoiceLineItem,
  TaxInvoiceMetadata,
  TaxInvoicePaymentRecord,
  TaxInvoiceStayContext,
} from "../folios/PrintableTaxInvoice.js";
import type {
  BanquetBillingConfig,
  BanquetSettlementFinancials,
  StagedDepositRecord,
} from "./BanquetSettlementModal.js";

// ============================================================================
// Types
// ============================================================================

export interface BanquetTaxInvoiceBundle {
  readonly hotel: TaxInvoiceHotelProfile;
  readonly guest: TaxInvoiceGuestProfile;
  readonly stay: TaxInvoiceStayContext;
  readonly lines: readonly TaxInvoiceLineItem[];
  readonly payments: readonly TaxInvoicePaymentRecord[];
  readonly metadata: TaxInvoiceMetadata;
  readonly complianceNotice: string;
}

// ============================================================================
// Statutory Rates & Internal Helpers (Cognitive Complexity <= 12)
// ============================================================================

const SC_RATE = 0.1;
const TDL_RATE = 0.01;
const SSCL_RATE = 0.025;
const VAT_RATE = 0.18;

function roundToCent(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function createStatutoryBanquetLine(
  id: string,
  date: string,
  description: string,
  quantity: number,
  unitPriceLkr: number,
): TaxInvoiceLineItem {
  const baseSupply = roundToCent(quantity * unitPriceLkr);
  const sc = roundToCent(baseSupply * SC_RATE);
  const subtotalAfterSc = baseSupply + sc;
  const tdl = roundToCent(subtotalAfterSc * TDL_RATE);
  const sscl = roundToCent(subtotalAfterSc * SSCL_RATE);
  const vatBase = subtotalAfterSc + tdl + sscl;
  const vat = roundToCent(vatBase * VAT_RATE);
  const totalGross = roundToCent(vatBase + vat);

  return {
    id,
    date,
    department: "BANQUETS",
    description,
    quantity,
    unitPriceLkr,
    baseSupplyLkr: baseSupply,
    serviceChargeLkr: sc,
    tdlLkr: tdl,
    ssclLkr: sscl,
    vatLkr: vat,
    totalGrossLkr: totalGross,
    isScExempt: false,
  };
}

// ============================================================================
// Core Mapping Functions
// ============================================================================

export function computeBanquetLineItems(
  config: BanquetBillingConfig,
  financials: BanquetSettlementFinancials,
): readonly TaxInvoiceLineItem[] {
  const lines: TaxInvoiceLineItem[] = [];

  // 1. Guaranteed Wedding/Banquet Package
  lines.push(
    createStatutoryBanquetLine(
      "LINE-PKG-MAIN",
      config.eventDate,
      `Guaranteed Wedding Package - ${config.eventName} (${config.hallName})`,
      config.guaranteedPax,
      config.perPaxRateLkr,
    ),
  );

  // 2. Extra Pax Overflow Surcharge
  if (financials.extraPaxCount > 0) {
    lines.push(
      createStatutoryBanquetLine(
        "LINE-PKG-EXTRA",
        config.eventDate,
        `Extra Guest Overflow Cover (${financials.extraPaxCount} pax)`,
        financials.extraPaxCount,
        config.extraPaxRateLkr,
      ),
    );
  }

  // 3. Devilled Table Bite Platters
  for (let i = 0; i < config.biteOrders.length; i++) {
    const bite = config.biteOrders[i];
    if (bite && bite.platterCount > 0) {
      lines.push(
        createStatutoryBanquetLine(
          `LINE-BITE-${bite.id || i}`,
          config.eventDate,
          `Table Bite: ${bite.dishNameEn}`,
          bite.platterCount,
          bite.unitPriceLkr,
        ),
      );
    }
  }

  // 4. Hard Liquor Corkage & Chasers
  if (config.corkageBottleCount > 0) {
    lines.push(
      createStatutoryBanquetLine(
        "LINE-CORKAGE",
        config.eventDate,
        `Hard-Liquor Corkage & Continuous Ice Bar Service (${config.corkageBottleCount} bottles)`,
        config.corkageBottleCount,
        config.corkageRatePerBottleLkr,
      ),
    );
  }

  // 5. Hall Hire & AC Overtime
  if (config.acOvertimeHours > 0) {
    lines.push(
      createStatutoryBanquetLine(
        "LINE-OVERTIME",
        config.eventDate,
        `Air Conditioning & Hall Overtime (${config.acOvertimeHours} hours)`,
        config.acOvertimeHours,
        config.acOvertimeHourlyRateLkr,
      ),
    );
  }

  // 6. Sundry Event Add-Ons
  if (config.sundryChargesLkr > 0) {
    lines.push(
      createStatutoryBanquetLine(
        "LINE-SUNDRY",
        config.eventDate,
        config.sundryDescription || "Sundry Banquet & Cultural Add-Ons",
        1,
        config.sundryChargesLkr,
      ),
    );
  }

  return lines;
}

export function computeBanquetPaymentRecords(
  stagedDeposits: readonly StagedDepositRecord[],
): readonly TaxInvoicePaymentRecord[] {
  return stagedDeposits.map((dep, idx) => ({
    id: `PAY-BNQ-${dep.receiptNumber || idx}`,
    tenderType: `${dep.milestoneStage} - ${dep.paymentMethod}`,
    amountLkr: dep.amountLkr,
    referenceOrAuth: dep.referenceNumber,
    settledAt: dep.paidDate,
  }));
}

export function getBanquetTaxComplianceNotice(lang: SupportedLanguage = "en"): string {
  switch (lang) {
    case "si":
      return "මෙම ලේඛනය ශ්රී ලංකා දේශීය ආදායම් පනත යටතේ නිකුත් කරන ලද නිල බදු ඉන්වොයිසියකි. 10% සේවා ගාස්තු, 1% TDL, 2.5% SSCL සහ 18% VAT බදු අන්තර්ගතය.";
    case "ta":
      return "இந்த ஆவணம் இலங்கை உள்நாட்டு வருமானச் சட்டத்தின் கீழ் வழங்கப்பட்ட அதிகாரப்பூர்வ வரி விலைப்பட்டியல் ஆகும். 10% சேவை கட்டணம், 1% TDL, 2.5% SSCL மற்றும் 18% VAT வரிகள் அடங்கும்.";
    default:
      return "Official Statutory Tax Invoice issued pursuant to Inland Revenue Act No. 24 of 2017 & Tourism Development Act. Includes 10% SC, 1% TDL, 2.5% SSCL, and 18% VAT.";
  }
}

export function mapBanquetBillingToTaxInvoice(
  config: BanquetBillingConfig,
  financials: BanquetSettlementFinancials,
  language: SupportedLanguage = "en",
): BanquetTaxInvoiceBundle {
  const hotel: TaxInvoiceHotelProfile = {
    hotelName: config.hotelName || "Galle Face Heritage Hotel & Spa",
    legalEntityName: `${config.hotelName || "Galle Face Heritage Hotel"} PLC`,
    address: "2 Galle Road, Kollupitiya",
    city: "Colombo 03",
    postalCode: "00300",
    country: "Sri Lanka",
    phone: "+94 11 254 1010",
    email: "banquets@gallefaceheritage.lk",
    tin: "102938475",
    vatRegNo: "102938475-7000",
    ssclRegNo: "102938475-9000",
    sltdaRegNo: "SLTDA/SQA/HOT/00142",
    isVatRegistered: true,
    bankRemittance: {
      bankName: "Commercial Bank of Ceylon PLC",
      accountName: `${config.hotelName || "Galle Face Heritage"} Banquets Operating Account`,
      accountNumber: "1000492817",
      branchName: "Colombo Foreign Branch",
      swiftBicCode: "CCEYLKX",
    },
  };

  const guest: TaxInvoiceGuestProfile = {
    guestFullName: config.clientName,
    passportOrNic: config.clientNicPassport,
    phone: config.clientPhone,
    companyName: config.clientCompany,
  };

  const stay: TaxInvoiceStayContext = {
    bookingReference: config.beoNumber,
    roomNumber: "BALLROOM",
    roomTypeName: config.hallName,
    checkInDate: config.eventDate,
    checkOutDate: config.eventDate,
    nightsCount: 1,
    adultsCount: financials.totalPaxCount,
    mealPlan: "Wedding Banquet Catering",
    billingType: config.clientCompany ? "CORPORATE" : "DIRECT_GUEST",
  };

  const lines = computeBanquetLineItems(config, financials);
  const payments = computeBanquetPaymentRecords(config.stagedDeposits);

  const complianceNotice = getBanquetTaxComplianceNotice(language);

  const metadata: TaxInvoiceMetadata = {
    invoiceNumber: config.invoiceNumber,
    invoiceDate: config.eventDate,
    folioNumber: config.beoNumber,
    cashierName: "Banquet Operations Manager",
    partition: "GUEST_PERSONAL",
    notes: complianceNotice,
  };

  return {
    hotel,
    guest,
    stay,
    lines,
    payments,
    metadata,
    complianceNotice,
  };
}
