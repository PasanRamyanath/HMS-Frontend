/**
 * @hms/frontend - Printable A4 GRN, GIN & Purchase Order Voucher Template (`PrintableStoreVoucher.tsx`)
 *
 * Implements Step 395 (Phase 16.20) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Multi-type printable A4 store operations voucher with Storekeeper, Receiving Chef,
 * and Finance Manager signature lines for:
 *
 * 1. GRN (Goods Received Note) — Supplier intake, delivery notes, and batch expiry.
 * 2. GIN (Goods Issue Note) — Main central store to kitchen/bar department transfers.
 * 3. PO (Purchase Order) — Official purchase contract with statutory tax calculations.
 *
 * Dual Display Modes:
 * - On-Screen: Apple Liquid Glass translucent preview with voucher type selector.
 * - Print Mode (@media print): High-density A4 document formatting with signature sign-off lines,
 * statutory tax breakdowns (TIN, VAT, SSCL, SLTDA), and page-break optimization.
 *
 * Apple Human Interface Guidelines:
 * - Liquid Glass styling, continuous squircle radii, SF Pro optical typography hierarchy,
 * tabular numbers (.tabular-nums-lkr), >= 44x44pt touch targets, and trilingual localizations (en, si, ta).
 */

import type React from "react";
import { useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type StoreVoucherType = "GRN" | "GIN" | "PO";

export interface VoucherHotelInfo {
  readonly hotelName: string;
  readonly legalEntityName: string;
  readonly address: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly tin: string;
  readonly vatRegNo: string;
  readonly ssclRegNo: string;
  readonly sltdaRegNo: string;
}

export interface StoreVoucherLineItem {
  readonly itemNumber: number;
  readonly sku: string;
  readonly name: string;
  readonly unitOfMeasure: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly lineTotalLkr: number;
  readonly batchNumber?: string | undefined;
  readonly expiryDate?: string | undefined;
  readonly remarks?: string | undefined;
}

export interface VoucherSignatureOfficer {
  readonly name: string;
  readonly title: string;
  readonly date?: string | undefined;
  readonly isSigned: boolean;
}

export interface StoreVoucherDocument {
  readonly voucherType: StoreVoucherType;
  readonly voucherNumber: string;
  readonly date: string;
  readonly hotel: VoucherHotelInfo;
  readonly department: string;
  readonly counterpartyName: string;
  readonly counterpartyContact?: string | undefined;
  readonly referenceNumber?: string | undefined;
  readonly items: readonly StoreVoucherLineItem[];
  readonly subtotalLkr: number;
  readonly vatAmountLkr?: number | undefined;
  readonly ssclAmountLkr?: number | undefined;
  readonly totalGrossLkr: number;
  readonly storekeeper: VoucherSignatureOfficer;
  readonly receivingOfficer: VoucherSignatureOfficer;
  readonly financialController: VoucherSignatureOfficer;
  readonly remarks?: string | undefined;
  readonly status: "DRAFT" | "APPROVED" | "COMPLETED";
}

// ============================================================================
// Default Resort Data Models (Sri Lankan Luxury Resort Sample Vouchers)
// ============================================================================

export const DEFAULT_VOUCHER_HOTEL: VoucherHotelInfo = {
  hotelName: "Amanwella Resort & Ayurveda Sanctuary",
  legalEntityName: "Amanwella Tangalle Hospitality (Pvt) Ltd",
  address: "Boddhi Mawatha, Wella Wathuara, Godellawela",
  city: "Tangalle, Southern Province, Sri Lanka",
  phone: "+94 47 224 1100",
  email: "procurement@amanwella-resort.com",
  tin: "109847291-7000",
  vatRegNo: "VAT-109847291-7000",
  ssclRegNo: "SSCL-109847291-0001",
  sltdaRegNo: "SLTDA/SQA/HOT/00842",
};

export const DEFAULT_GRN_VOUCHER: StoreVoucherDocument = {
  voucherType: "GRN",
  voucherNumber: "GRN-20261020-0084",
  date: "2026-10-20",
  hotel: DEFAULT_VOUCHER_HOTEL,
  department: "Food & Beverage (Central Stores)",
  counterpartyName: "Lanka Fresh Seafoods & Lagoon Supplies (Pvt) Ltd",
  counterpartyContact: "+94 77 456 7890 (Mr. Sunil Perera)",
  referenceNumber: "PO-2026-0042 / Inv-48912",
  items: [
    {
      itemNumber: 1,
      sku: "FISH-PRAWN-JUMBO",
      name: "Negombo Lagoon Tiger Prawns (Jumbo Grade 15-20)",
      unitOfMeasure: "kg",
      quantity: 35,
      unitPriceLkr: 4800,
      lineTotalLkr: 168000,
      batchNumber: "B-20261020-01",
      expiryDate: "2026-11-05",
      remarks: "Chilled on fresh flaked ice at 2.4°C",
    },
    {
      itemNumber: 2,
      sku: "SEAFOOD-CRAB-MUD",
      name: "Southern Lagoon Live Mud Crabs (Large 600g+)",
      unitOfMeasure: "kg",
      quantity: 25,
      unitPriceLkr: 5200,
      lineTotalLkr: 130000,
      batchNumber: "B-20261020-02",
      expiryDate: "2026-10-22",
      remarks: "Live intake verified by Executive Sous Chef",
    },
    {
      itemNumber: 3,
      sku: "DRY-BASMATI-001",
      name: "Araliya Keeri Samba / Basmati Aged Rice (50kg Bag)",
      unitOfMeasure: "kg",
      quantity: 500,
      unitPriceLkr: 340,
      lineTotalLkr: 170000,
      batchNumber: "B-20261020-03",
      expiryDate: "2027-04-30",
      remarks: "Inspected dry sealed double jute sacks",
    },
  ],
  subtotalLkr: 468000,
  vatAmountLkr: 0, // Fresh produce exempt from VAT
  ssclAmountLkr: 0,
  totalGrossLkr: 468000,
  storekeeper: {
    name: "Gamini Wijesinghe",
    title: "Senior Head Storekeeper",
    date: "2026-10-20",
    isSigned: true,
  },
  receivingOfficer: {
    name: "Kasun Jayasuriya",
    title: "Executive Chef",
    date: "2026-10-20",
    isSigned: true,
  },
  financialController: {
    name: "Sunil Rathnayake",
    title: "Director of Finance & Operations",
    date: "2026-10-20",
    isSigned: true,
  },
  remarks:
    "All temperature sensitive items inspected at receiving dock prior to cold room FEFO transfer. Zero transit spoilage.",
  status: "APPROVED",
};

export const DEFAULT_GIN_VOUCHER: StoreVoucherDocument = {
  voucherType: "GIN",
  voucherNumber: "GIN-20261020-0112",
  date: "2026-10-20",
  hotel: DEFAULT_VOUCHER_HOTEL,
  department: "Main Hot Kitchen & Seafood Grill",
  counterpartyName: "The Ocean Breeze Restaurant & Hot Kitchen Line",
  counterpartyContact: "Station Chef: Anura Bandara (Ext 401)",
  referenceNumber: "REQUISITION-KITCHEN-089",
  items: [
    {
      itemNumber: 1,
      sku: "FISH-PRAWN-JUMBO",
      name: "Negombo Lagoon Tiger Prawns (Jumbo Grade)",
      unitOfMeasure: "kg",
      quantity: 15,
      unitPriceLkr: 4800,
      lineTotalLkr: 72000,
      batchNumber: "B-20261020-01",
      remarks: "Daily dinner seafood buffet prep",
    },
    {
      itemNumber: 2,
      sku: "SPICE-CINNAMON-002",
      name: "Pure Ceylon Cinnamon Quills Grade ALBA",
      unitOfMeasure: "kg",
      quantity: 2,
      unitPriceLkr: 6800,
      lineTotalLkr: 13600,
      batchNumber: "B-20260910-04",
      remarks: "Curry powder milling and sauce stock",
    },
    {
      itemNumber: 3,
      sku: "DAIRY-COCO-001L",
      name: "Kotmale Pure Coconut Cream Tetra 1000ml",
      unitOfMeasure: "packets",
      quantity: 40,
      unitPriceLkr: 890,
      lineTotalLkr: 35600,
      batchNumber: "B-20261005-08",
      remarks: "Curry and dessert station issue",
    },
  ],
  subtotalLkr: 121200,
  totalGrossLkr: 121200,
  storekeeper: {
    name: "Gamini Wijesinghe",
    title: "Senior Head Storekeeper",
    date: "2026-10-20",
    isSigned: true,
  },
  receivingOfficer: {
    name: "Anura Bandara",
    title: "Executive Sous Chef",
    date: "2026-10-20",
    isSigned: true,
  },
  financialController: {
    name: "Sunil Rathnayake",
    title: "Director of Finance",
    date: "2026-10-20",
    isSigned: true,
  },
  remarks:
    "Direct issue from dry and cold stores against Kitchen Requisition #089. Transferred directly to kitchen chiller #2.",
  status: "COMPLETED",
};

export const DEFAULT_PO_VOUCHER: StoreVoucherDocument = {
  voucherType: "PO",
  voucherNumber: "PO-2026-0158",
  date: "2026-10-20",
  hotel: DEFAULT_VOUCHER_HOTEL,
  department: "Food & Beverage (Stores Replenishment)",
  counterpartyName: "Rockland Distilleries (Pvt) Ltd",
  counterpartyContact: "+94 11 269 5241 / orders@rockland.lk",
  referenceNumber: "PR-2026-0312",
  items: [
    {
      itemNumber: 1,
      sku: "LIQ-ARRACK-0750",
      name: "Rockland Old Arrack Extra Fine 750ml",
      unitOfMeasure: "bottles",
      quantity: 60,
      unitPriceLkr: 4250,
      lineTotalLkr: 255000,
      remarks: "Excise seal intact with verified hologram",
    },
    {
      itemNumber: 2,
      sku: "LIQ-DRY-GIN-0750",
      name: "Rockland Dry Gin London Distilled 750ml",
      unitOfMeasure: "bottles",
      quantity: 36,
      unitPriceLkr: 3800,
      lineTotalLkr: 136800,
      remarks: "Beach Bar signature cocktail supply",
    },
  ],
  subtotalLkr: 391800,
  vatAmountLkr: 70524, // 18% VAT
  ssclAmountLkr: 9795, // 2.5% SSCL
  totalGrossLkr: 472119,
  storekeeper: {
    name: "Gamini Wijesinghe",
    title: "Senior Head Storekeeper",
    date: "2026-10-20",
    isSigned: true,
  },
  receivingOfficer: {
    name: "Dinesh Fernando",
    title: "Beverage Manager & Sommelier",
    date: "2026-10-20",
    isSigned: true,
  },
  financialController: {
    name: "Sunil Rathnayake",
    title: "Director of Finance",
    date: "2026-10-20",
    isSigned: true,
  },
  remarks:
    "Payment terms: 30 days net from delivery and verified GRN. Delivery target: 2026-10-24.",
  status: "APPROVED",
};

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export interface StoreVoucherTranslation {
  readonly titles: Record<StoreVoucherType, string>;
  readonly subtitles: Record<StoreVoucherType, string>;
  readonly buttons: {
    readonly printA4: string;
    readonly toggleWatermark: string;
  };
  readonly labels: {
    readonly voucherNo: string;
    readonly date: string;
    readonly department: string;
    readonly supplierOrDestination: string;
    readonly destinationOutlet: string;
    readonly referenceNo: string;
    readonly tin: string;
    readonly vatReg: string;
    readonly ssclReg: string;
    readonly sltdaReg: string;
    readonly contact: string;
    readonly status: string;
    readonly remarks: string;
  };
  readonly table: {
    readonly itemNo: string;
    readonly sku: string;
    readonly description: string;
    readonly uom: string;
    readonly quantity: string;
    readonly unitPrice: string;
    readonly lineTotal: string;
    readonly batchNo: string;
  };
  readonly totals: {
    readonly subtotal: string;
    readonly sscl: string;
    readonly vat: string;
    readonly grandTotal: string;
  };
  readonly signatures: {
    readonly storekeeper: string;
    readonly receivingOfficer: string;
    readonly financialController: string;
    readonly signPrompt: string;
    readonly verifiedStamp: string;
  };
}

export const STORE_VOUCHER_TRANSLATIONS: Record<"en" | "si" | "ta", StoreVoucherTranslation> = {
  en: {
    titles: {
      GRN: "GOODS RECEIVED NOTE (GRN)",
      GIN: "GOODS ISSUE NOTE (GIN)",
      PO: "PURCHASE ORDER (PO)",
    },
    subtitles: {
      GRN: "Stores Receiving & Quality Inspection Intake Voucher",
      GIN: "Central Stores to Operating Department Transfer Voucher",
      PO: "Official Vendor Procurement & Delivery Contract Voucher",
    },
    buttons: {
      printA4: "Print A4 Voucher",
      toggleWatermark: "Draft Watermark",
    },
    labels: {
      voucherNo: "Voucher No:",
      date: "Date:",
      department: "Department / Outlet:",
      supplierOrDestination: "Vendor / Source:",
      destinationOutlet: "Recipient Outlet:",
      referenceNo: "Reference / PR No:",
      tin: "TIN:",
      vatReg: "VAT Reg:",
      ssclReg: "SSCL Reg:",
      sltdaReg: "SLTDA Reg:",
      contact: "Contact:",
      status: "Workflow Status:",
      remarks: "Operational Remarks & Receiving Notes:",
    },
    table: {
      itemNo: "#",
      sku: "SKU Code",
      description: "Item Name & Specifications",
      uom: "UOM",
      quantity: "Qty",
      unitPrice: "Unit Price (LKR)",
      lineTotal: "Total (LKR)",
      batchNo: "Batch / Expiry",
    },
    totals: {
      subtotal: "Subtotal:",
      sscl: "SSCL (2.5%):",
      vat: "VAT (18%):",
      grandTotal: "Grand Total (LKR):",
    },
    signatures: {
      storekeeper: "Storekeeper / Issued By",
      receivingOfficer: "Receiving Chef / HOD",
      financialController: "Financial Controller / GM",
      signPrompt: "Authorized Signature & Stamp",
      verifiedStamp: "VERIFIED & ENTERED INTO ERP",
    },
  },
  si: {
    titles: {
      GRN: "භාණ්ඩ ලැබීමේ සටහන (GRN)",
      GIN: "භාණ්ඩ නිකුත් කිරීමේ සටහන (GIN)",
      PO: "මිලදී ගැනීමේ ඇණවුම (PO)",
    },
    subtitles: {
      GRN: "ගබඩා භාණ්ඩ ලැබීම සහ තත්ත්ව පරීක්ෂණ වවුචරය",
      GIN: "මධ්යම ගබඩාවෙන් මුළුතැන්ගෙට/බාර් එකට නිකුත් කිරීමේ වවුචරය",
      PO: "සැපයුම්කරු වෙත නිල මිලදී ගැනීමේ ඇණවුම් වවුචරය",
    },
    buttons: {
      printA4: "A4 වවුචරය මුද්රණය කරන්න",
      toggleWatermark: "කෙටුම්පත් සලකුණ",
    },
    labels: {
      voucherNo: "වවුචර් අංකය:",
      date: "දිනය:",
      department: "අංශය / අලෙවිසැල:",
      supplierOrDestination: "සැපයුම්කරු / මූලාශ්රය:",
      destinationOutlet: "ලබාගන්නා අංශය:",
      referenceNo: "යොමු / PR අංකය:",
      tin: "බදු අංකය (TIN):",
      vatReg: "VAT ලියාපදිංචිය:",
      ssclReg: "SSCL ලියාපදිංචිය:",
      sltdaReg: "SLTDA ලියාපදිංචිය:",
      contact: "දුරකථන:",
      status: "තත්ත්වය:",
      remarks: "මෙහෙයුම් සටහන් සහ ලැබීම් විස්තර:",
    },
    table: {
      itemNo: "අංකය",
      sku: "SKU කේතය",
      description: "අයිතම විස්තරය",
      uom: "ඒකකය",
      quantity: "ප්රමාණය",
      unitPrice: "ඒකක මිල (රු.)",
      lineTotal: "එකතුව (රු.)",
      batchNo: "කාණ්ඩය / කල් ඉකුත්වීම",
    },
    totals: {
      subtotal: "උප එකතුව:",
      sscl: "SSCL (2.5%):",
      vat: "VAT (18%):",
      grandTotal: "මුළු එකතුව (රු.):",
    },
    signatures: {
      storekeeper: "ගබඩා භාරකරු / නිකුත් කළේ",
      receivingOfficer: "භාරගත් විධායක චෙෆ් / ප්රධානී",
      financialController: "මූල්ය පාලක / සාමාන්යාධිකාරී",
      signPrompt: "බලයලත් අත්සන සහ මුද්රාව",
      verifiedStamp: "තහවුරු කර ERP වෙත ඇතුළත් කරන ලදී",
    },
  },
  ta: {
    titles: {
      GRN: "பொருட்கள் பெறுதல் குறிப்பு (GRN)",
      GIN: "பொருட்கள் வழங்கல் குறிப்பு (GIN)",
      PO: "கொள்முதல் ஆணை (PO)",
    },
    subtitles: {
      GRN: "களஞ்சிய பொருட்கள் பெறுதல் & தர ஆய்வுக் குறிப்பு",
      GIN: "மத்திய களஞ்சியத்திலிருந்து சமையலறைக்கு வழங்கும் குறிப்பு",
      PO: "விநியோகஸ்தர் கொள்முதல் மற்றும் விநியோக ஒப்பந்தம்",
    },
    buttons: {
      printA4: "A4 வவுச்சரை அச்சிடுக",
      toggleWatermark: "வரைவு குறிப்பு",
    },
    labels: {
      voucherNo: "வவுச்சர் எண்:",
      date: "தேதி:",
      department: "துறை / விற்பனை நிலையம்:",
      supplierOrDestination: "வழங்குநர் / மூலம்:",
      destinationOutlet: "பெறும் துறை:",
      referenceNo: "குறிப்பு எண்:",
      tin: "வரி எண் (TIN):",
      vatReg: "VAT பதிவு:",
      ssclReg: "SSCL பதிவு:",
      sltdaReg: "SLTDA பதிவு:",
      contact: "தொடர்பு:",
      status: "நிலை:",
      remarks: "செயல்பாட்டுக் குறிப்புகள்:",
    },
    table: {
      itemNo: "எண்",
      sku: "SKU குறியீடு",
      description: "பொருள் விவரம்",
      uom: "அலகு",
      quantity: "அளவு",
      unitPrice: "விலை (ரூ.)",
      lineTotal: "மொத்தம் (ரூ.)",
      batchNo: "தொகுதி / காலாவதி",
    },
    totals: {
      subtotal: "உப மொத்தம்:",
      sscl: "SSCL (2.5%):",
      vat: "VAT (18%):",
      grandTotal: "மொத்தத் தொகை (ரூ.):",
    },
    signatures: {
      storekeeper: "களஞ்சிய காப்பாளர் / வழங்கியவர்",
      receivingOfficer: "பெறும் தலைமை செஃப் / துறைத் தலைவர்",
      financialController: "நிதி கட்டுப்பாட்டாளர் / பொது மேலாளர்",
      signPrompt: "அங்கீகரிக்கப்பட்ட கையொப்பம் & முத்திரை",
      verifiedStamp: "சரிபார்க்கப்பட்டு ERP இல் பதிவு செய்யப்பட்டது",
    },
  },
};

// ============================================================================
// Pure Math & Utility Helpers
// ============================================================================

export function formatVoucherLkr(amount: number): string {
  return `Rs. ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const formatLkr = formatVoucherLkr;

export function calculateVoucherTotals(
  items: readonly StoreVoucherLineItem[],
  taxConfig?: { applyVat?: boolean; applySscl?: boolean },
) {
  let subtotalLkr = 0;
  for (const it of items) {
    subtotalLkr += it.lineTotalLkr;
  }
  subtotalLkr = Math.round((subtotalLkr + Number.EPSILON) * 100) / 100;

  const ssclLkr = taxConfig?.applySscl
    ? Math.round((subtotalLkr * 0.025 + Number.EPSILON) * 100) / 100
    : 0;

  const vatBase = subtotalLkr + ssclLkr;
  const vatLkr = taxConfig?.applyVat
    ? Math.round((vatBase * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const totalGrossLkr = Math.round((vatBase + vatLkr + Number.EPSILON) * 100) / 100;

  return {
    subtotalLkr,
    ssclLkr,
    vatLkr,
    totalGrossLkr,
  };
}

// ============================================================================
// Component Props
// ============================================================================

export interface PrintableStoreVoucherProps {
  readonly initialVoucherType?: StoreVoucherType | undefined;
  readonly grnVoucher?: StoreVoucherDocument | undefined;
  readonly ginVoucher?: StoreVoucherDocument | undefined;
  readonly poVoucher?: StoreVoucherDocument | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
  readonly showWatermark?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Main PrintableStoreVoucher Component
// ============================================================================

export function PrintableStoreVoucher({
  initialVoucherType = "GRN",
  grnVoucher = DEFAULT_GRN_VOUCHER,
  ginVoucher = DEFAULT_GIN_VOUCHER,
  poVoucher = DEFAULT_PO_VOUCHER,
  language = "en",
  showWatermark: initialWatermark = false,
  className = "",
}: PrintableStoreVoucherProps): React.JSX.Element {
  const [voucherType, setVoucherType] = useState<StoreVoucherType>(initialVoucherType);
  const [isWatermarkActive, setIsWatermarkActive] = useState<boolean>(initialWatermark);

  const t: StoreVoucherTranslation =
    STORE_VOUCHER_TRANSLATIONS[language] ?? STORE_VOUCHER_TRANSLATIONS.en;

  const currentDoc: StoreVoucherDocument = useMemo(() => {
    if (voucherType === "GIN") return ginVoucher;
    if (voucherType === "PO") return poVoucher;
    return grnVoucher;
  }, [voucherType, grnVoucher, ginVoucher, poVoucher]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className={`space-y-6 max-w-5xl mx-auto p-4 md:p-6 font-sans ${className}`}
      data-testid="printable-store-voucher"
    >
      {/* On-Screen Screen HUD Toolbar (Hidden in print) */}
      <VoucherControlToolbar
        t={t}
        voucherType={voucherType}
        setVoucherType={setVoucherType}
        isWatermarkActive={isWatermarkActive}
        setIsWatermarkActive={setIsWatermarkActive}
        onPrint={handlePrint}
      />

      {/* Official Printable A4 Document Sheet */}
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-gray-200 text-gray-900 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
        <VoucherHeaderBlock t={t} doc={currentDoc} />

        <VoucherMetadataGrid t={t} doc={currentDoc} />

        <VoucherLineItemsTable t={t} items={currentDoc.items} />

        <VoucherTotalsAndRemarks t={t} doc={currentDoc} />

        <VoucherThreeSignaturesBlock t={t} doc={currentDoc} />

        {isWatermarkActive && (
          <div className="text-center py-2 text-xs font-mono uppercase tracking-widest text-red-500/70 border border-dashed border-red-500/30 rounded mt-4">
            *** DRAFT / FOR INTERNAL REVIEW ONLY — NOT AN OFFICIAL FISCAL TAX DOCUMENT ***
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent 1: Screen Control Toolbar
// ============================================================================

interface VoucherControlToolbarProps {
  readonly t: StoreVoucherTranslation;
  readonly voucherType: StoreVoucherType;
  readonly setVoucherType: (type: StoreVoucherType) => void;
  readonly isWatermarkActive: boolean;
  readonly setIsWatermarkActive: (fn: (v: boolean) => boolean) => void;
  readonly onPrint: () => void;
}

function VoucherControlToolbar({
  t,
  voucherType,
  setVoucherType,
  isWatermarkActive,
  setIsWatermarkActive,
  onPrint,
}: VoucherControlToolbarProps) {
  const typeOptions: SegmentedControlOption<StoreVoucherType>[] = [
    { id: "GRN", label: "GRN (Receipt)" },
    { id: "GIN", label: "GIN (Issue)" },
    { id: "PO", label: "PO (Order)" },
  ];

  return (
    <GlassCard material="elevated" radius="xl" className="p-4 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SegmentedControl options={typeOptions} value={voucherType} onChange={setVoucherType} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsWatermarkActive((v) => !v)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isWatermarkActive
                ? "bg-red-500/10 border-red-500/30 text-red-600 "
                : "bg-gray-100 border-gray-200 text-gray-500"
            }`}
          >
            {t.buttons.toggleWatermark}
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            <span>{t.buttons.printA4}</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent 2: Voucher Header Block
// ============================================================================

interface VoucherHeaderBlockProps {
  readonly t: StoreVoucherTranslation;
  readonly doc: StoreVoucherDocument;
}

function VoucherHeaderBlock({ t, doc }: VoucherHeaderBlockProps) {
  const title = t.titles[doc.voucherType];
  const subtitle = t.subtitles[doc.voucherType];

  return (
    <div className="border-b-2 border-gray-900 pb-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase text-gray-900 ">
            {doc.hotel.hotelName}
          </h1>
          <p className="text-xs font-medium text-gray-600 mt-0.5">{doc.hotel.legalEntityName}</p>
          <p className="text-xs text-gray-500 ">
            {doc.hotel.address}, {doc.hotel.city}
          </p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Tel: {doc.hotel.phone} &bull; Email: {doc.hotel.email}
          </p>
        </div>

        <div className="text-left md:text-right">
          <div className="inline-block bg-gray-100 px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider mb-2">
            {title}
          </div>
          <p className="text-[11px] text-gray-500 max-w-xs">{subtitle}</p>
          <div className="mt-2 text-xs font-mono">
            <span className="font-bold text-gray-900 ">{doc.voucherNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent 3: Voucher Metadata Grid
// ============================================================================

interface VoucherMetadataGridProps {
  readonly t: StoreVoucherTranslation;
  readonly doc: StoreVoucherDocument;
}

function VoucherMetadataGrid({ t, doc }: VoucherMetadataGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 ">
      <div className="space-y-1.5">
        <div className="flex">
          <span className="w-36 font-semibold text-gray-600 ">{t.labels.voucherNo}</span>
          <span className="font-mono font-bold text-gray-900 ">{doc.voucherNumber}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold text-gray-600 ">{t.labels.date}</span>
          <span className="font-mono font-bold text-gray-900 ">{doc.date}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold text-gray-600 ">{t.labels.department}</span>
          <span className="font-semibold text-gray-800 ">{doc.department}</span>
        </div>
        <div className="flex">
          <span className="w-36 font-semibold text-gray-600 ">
            {doc.voucherType === "GIN"
              ? t.labels.destinationOutlet
              : t.labels.supplierOrDestination}
          </span>
          <span className="font-bold text-gray-900 ">{doc.counterpartyName}</span>
        </div>
        {doc.counterpartyContact && (
          <div className="flex">
            <span className="w-36 font-semibold text-gray-600 ">{t.labels.contact}</span>
            <span className="font-mono text-gray-700 ">{doc.counterpartyContact}</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 md:border-l md:border-gray-200 md:pl-4">
        {doc.referenceNumber && (
          <div className="flex">
            <span className="w-32 font-semibold text-gray-600 ">{t.labels.referenceNo}</span>
            <span className="font-mono font-bold text-blue-600 ">{doc.referenceNumber}</span>
          </div>
        )}
        <div className="flex">
          <span className="w-32 font-semibold text-gray-600 ">{t.labels.tin}</span>
          <span className="font-mono text-gray-800 ">{doc.hotel.tin}</span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold text-gray-600 ">{t.labels.vatReg}</span>
          <span className="font-mono text-gray-800 ">{doc.hotel.vatRegNo}</span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold text-gray-600 ">{t.labels.sltdaReg}</span>
          <span className="font-mono text-gray-800 ">{doc.hotel.sltdaRegNo}</span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-semibold text-gray-600 ">{t.labels.status}</span>
          <span className="font-mono font-bold text-xs text-emerald-600 ">{doc.status}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent 4: Voucher Line Items Table
// ============================================================================

interface VoucherLineItemsTableProps {
  readonly t: StoreVoucherTranslation;
  readonly items: readonly StoreVoucherLineItem[];
}

function VoucherLineItemsTable({ t, items }: VoucherLineItemsTableProps) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-y-2 border-gray-900 bg-gray-100/70 font-bold uppercase tracking-wider text-gray-700 ">
            <th className="py-2 px-2 text-center w-8">{t.table.itemNo}</th>
            <th className="py-2 px-3 w-28">{t.table.sku}</th>
            <th className="py-2 px-3">{t.table.description}</th>
            <th className="py-2 px-2 text-center w-14">{t.table.uom}</th>
            <th className="py-2 px-2 text-right w-16">{t.table.quantity}</th>
            <th className="py-2 px-3 text-right w-28">{t.table.unitPrice}</th>
            <th className="py-2 px-3 text-right w-32">{t.table.lineTotal}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 ">
          {items.map((it) => (
            <tr key={`${it.itemNumber}-${it.sku}`} className="hover:bg-gray-50/50">
              <td className="py-2.5 px-2 text-center font-mono text-gray-500">{it.itemNumber}</td>
              <td className="py-2.5 px-3 font-mono font-bold text-gray-800 ">{it.sku}</td>
              <td className="py-2.5 px-3">
                <p className="font-semibold text-gray-900 ">{it.name}</p>
                {(it.batchNumber || it.expiryDate || it.remarks) && (
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {it.batchNumber ? `Batch: ${it.batchNumber} ` : ""}
                    {it.expiryDate ? `&bull; Exp: ${it.expiryDate} ` : ""}
                    {it.remarks ? `&bull; ${it.remarks}` : ""}
                  </p>
                )}
              </td>
              <td className="py-2.5 px-2 text-center font-mono text-gray-600 ">
                {it.unitOfMeasure}
              </td>
              <td className="py-2.5 px-2 text-right font-bold tabular-nums-lkr text-gray-900 ">
                {it.quantity}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums-lkr text-gray-700 ">
                {formatLkr(it.unitPriceLkr)}
              </td>
              <td className="py-2.5 px-3 text-right font-bold tabular-nums-lkr text-gray-900 ">
                {formatLkr(it.lineTotalLkr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Subcomponent 5: Voucher Totals & Remarks Block
// ============================================================================

interface VoucherTotalsAndRemarksProps {
  readonly t: StoreVoucherTranslation;
  readonly doc: StoreVoucherDocument;
}

function VoucherTotalsAndRemarks({ t, doc }: VoucherTotalsAndRemarksProps) {
  const hasTaxes = (doc.vatAmountLkr ?? 0) > 0 || (doc.ssclAmountLkr ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-8">
      {/* Operational remarks */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 ">
        <h4 className="font-bold uppercase tracking-wider text-gray-600 mb-1.5">
          {t.labels.remarks}
        </h4>
        <p className="text-gray-700 leading-relaxed font-mono text-[11px]">
          {doc.remarks || "Standard receipt against purchase specification."}
        </p>
      </div>

      {/* Financial totals summary */}
      <div className="space-y-2 border-t-2 border-gray-900 pt-2 text-right">
        <div className="flex justify-between py-1">
          <span className="font-semibold text-gray-600 ">{t.totals.subtotal}</span>
          <span className="font-bold tabular-nums-lkr text-gray-900 ">
            {formatLkr(doc.subtotalLkr)}
          </span>
        </div>

        {hasTaxes && (
          <>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-gray-600 ">{t.totals.sscl}</span>
              <span className="tabular-nums-lkr text-gray-800 ">
                {formatLkr(doc.ssclAmountLkr ?? 0)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-gray-600 ">{t.totals.vat}</span>
              <span className="tabular-nums-lkr text-gray-800 ">
                {formatLkr(doc.vatAmountLkr ?? 0)}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between py-2 border-t border-b-2 border-gray-900 text-sm font-black">
          <span className="uppercase text-gray-900 ">{t.totals.grandTotal}</span>
          <span className="tabular-nums-lkr text-emerald-600 ">{formatLkr(doc.totalGrossLkr)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent 6: Three Official Sign-Off Lines Block (Rung 3 Requirement)
// ============================================================================

interface VoucherThreeSignaturesBlockProps {
  readonly t: StoreVoucherTranslation;
  readonly doc: StoreVoucherDocument;
}

function VoucherThreeSignaturesBlock({ t, doc }: VoucherThreeSignaturesBlockProps) {
  return (
    <div className="pt-6 border-t border-gray-300 page-break-inside-avoid">
      <div className="grid grid-cols-3 gap-6 text-center text-xs">
        {/* 1. Storekeeper Line */}
        <div className="space-y-2">
          <div className="h-16 border-b border-gray-400 flex flex-col justify-end items-center pb-1">
            <span className="font-serif italic text-sm text-gray-800 ">{doc.storekeeper.name}</span>
          </div>
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            {t.signatures.storekeeper}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">
            {doc.storekeeper.title} &bull; {doc.storekeeper.date || doc.date}
          </p>
        </div>

        {/* 2. Receiving Chef / HOD Line */}
        <div className="space-y-2">
          <div className="h-16 border-b border-gray-400 flex flex-col justify-end items-center pb-1">
            <span className="font-serif italic text-sm text-gray-800 ">
              {doc.receivingOfficer.name}
            </span>
          </div>
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            {t.signatures.receivingOfficer}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">
            {doc.receivingOfficer.title} &bull; {doc.receivingOfficer.date || doc.date}
          </p>
        </div>

        {/* 3. Financial Controller Line */}
        <div className="space-y-2">
          <div className="h-16 border-b border-gray-400 flex flex-col justify-end items-center pb-1">
            <span className="font-serif italic text-sm text-gray-800 ">
              {doc.financialController.name}
            </span>
          </div>
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
            {t.signatures.financialController}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">
            {doc.financialController.title} &bull; {doc.financialController.date || doc.date}
          </p>
        </div>
      </div>

      <div className="text-center mt-6 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
        {t.signatures.verifiedStamp} &bull; SRI LANKA CLOUD SAAS HOTEL MANAGEMENT SYSTEM
      </div>
    </div>
  );
}
