import { useId, useMemo, useState } from "react";
import { formatLkr } from "../../lib/i18n.js";
import { generateQrSvg } from "../../lib/qrSvg.js";
import { buildLankaQrPayload } from "../settings/PaymentSettingsForm.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ThermalPaperWidth = 80 | 58;

export interface ThermalFolioHotelInfo {
  readonly hotelName: string;
  readonly address: string;
  readonly phone: string;
  readonly tin?: string | undefined;
  readonly sltdaRegNo?: string | undefined;
  readonly vatRegNo?: string | undefined;
  readonly lankaQrMerchantId?: string | undefined;
  readonly merchantCity?: string | undefined;
}

export interface ThermalFolioGuestInfo {
  readonly guestFullName: string;
  readonly roomNumber: string;
  readonly bookingReference: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nightsCount: number;
  readonly adultsCount: number;
  readonly mealPlan: string;
  readonly folioId: string;
}

export interface ThermalFolioItemLine {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly quantity: number;
  readonly amountLkr: number;
  readonly department?: string | undefined;
}

export interface ThermalFolioPaymentLine {
  readonly id: string;
  readonly method: string;
  readonly amountLkr: number;
  readonly date: string;
  readonly ref?: string | undefined;
}

export interface ThermalFolioTaxSummary {
  readonly baseSupplyLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
  readonly totalPaidLkr: number;
  readonly balanceDueLkr: number;
  readonly cbslUsdRateLkr?: number | undefined;
  readonly indicativeUsdBalance: number;
}

export interface PrintableThermalFolioProps {
  readonly hotel?: Partial<ThermalFolioHotelInfo> | undefined;
  readonly guest?: Partial<ThermalFolioGuestInfo> | undefined;
  readonly lines?: ReadonlyArray<ThermalFolioItemLine> | undefined;
  readonly payments?: ReadonlyArray<ThermalFolioPaymentLine> | undefined;
  readonly taxSummary?: Partial<ThermalFolioTaxSummary> | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly initialPaperWidth?: ThermalPaperWidth | undefined;
  readonly cashierName?: string | undefined;
  readonly printTimestamp?: string | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Defaults & Constants
// ============================================================================

export const DEFAULT_THERMAL_HOTEL: ThermalFolioHotelInfo = {
  hotelName: "Tangalle Breeze Resort & Spa",
  address: "42 Beach Road, Tangalle, Sri Lanka",
  phone: "+94 47 224 8900",
  tin: "109847261",
  sltdaRegNo: "SLTDA/SQA/PRO/00492",
  vatRegNo: "109847261-7000",
  lankaQrMerchantId: "000000000012345",
  merchantCity: "Tangalle",
};

export const DEFAULT_THERMAL_GUEST: ThermalFolioGuestInfo = {
  guestFullName: "Alexander James Wright",
  roomNumber: "104",
  bookingReference: "BK-2026-9042",
  checkInDate: "2026-10-16",
  checkOutDate: "2026-10-19",
  nightsCount: 3,
  adultsCount: 2,
  mealPlan: "HB",
  folioId: "FOLIO-2026-0991",
};

export const DEFAULT_THERMAL_LINES: ReadonlyArray<ThermalFolioItemLine> = [
  {
    id: "L1",
    date: "10/16",
    description: "Ocean Plunge Villa (Night 1)",
    quantity: 1,
    amountLkr: 65000,
    department: "ROOM",
  },
  {
    id: "L2",
    date: "10/17",
    description: "Ocean Plunge Villa (Night 2)",
    quantity: 1,
    amountLkr: 65000,
    department: "ROOM",
  },
  {
    id: "L3",
    date: "10/18",
    description: "Ocean Plunge Villa (Night 3)",
    quantity: 1,
    amountLkr: 65000,
    department: "ROOM",
  },
  {
    id: "L4",
    date: "10/17",
    description: "Lagoon Catch Lobster Dinner",
    quantity: 1,
    amountLkr: 24000,
    department: "RESTAURANT",
  },
  {
    id: "L5",
    date: "10/18",
    description: "Ayurvedic Compress Ritual (x2)",
    quantity: 2,
    amountLkr: 30000,
    department: "SPA",
  },
];

export const DEFAULT_THERMAL_PAYMENTS: ReadonlyArray<ThermalFolioPaymentLine> = [
  {
    id: "P1",
    method: "PayHere Online Card Pre-Auth",
    amountLkr: 87322.95,
    date: "10/15 14:22",
    ref: "PH-984210",
  },
  {
    id: "P2",
    method: "CBSL LankaQR (Commercial Bank Q+)",
    amountLkr: 150000,
    date: "10/19 11:15",
    ref: "LQR-983109",
  },
];

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeThermalTaxTotals(
  lines: ReadonlyArray<ThermalFolioItemLine>,
  payments: ReadonlyArray<ThermalFolioPaymentLine>,
  cbslUsdRateLkr = 305.5,
): ThermalFolioTaxSummary {
  let baseSupply = 0;
  for (const line of lines) {
    baseSupply += line.amountLkr;
  }
  const roundedBase = roundLkr(baseSupply);

  // Sri Lankan 4-stage tax compounding
  const sc = roundLkr(roundedBase * 0.1);
  const subtotalA = roundLkr(roundedBase + sc);
  const tdl = roundLkr(subtotalA * 0.01);
  const sscl = roundLkr(subtotalA * 0.025);
  const vatBase = roundLkr(subtotalA + tdl + sscl);
  const vat = roundLkr(vatBase * 0.18);
  const grandTotal = roundLkr(vatBase + vat);

  let totalPaid = 0;
  for (const p of payments) {
    totalPaid += p.amountLkr;
  }
  const roundedPaid = roundLkr(totalPaid);
  const balanceDue = roundLkr(Math.max(0, grandTotal - roundedPaid));

  const indicativeUsd =
    cbslUsdRateLkr > 0 && balanceDue > 0 ? roundLkr(balanceDue / cbslUsdRateLkr) : 0;

  return {
    baseSupplyLkr: roundedBase,
    serviceChargeLkr: sc,
    tdlLkr: tdl,
    ssclLkr: sscl,
    vatLkr: vat,
    grandTotalLkr: grandTotal,
    totalPaidLkr: roundedPaid,
    balanceDueLkr: balanceDue,
    cbslUsdRateLkr,
    indicativeUsdBalance: indicativeUsd,
  };
}

export function generateThermalLankaQrPayload(
  hotel: ThermalFolioHotelInfo,
  amountLkr: number,
  referenceId: string,
): string {
  return buildLankaQrPayload({
    merchantId: hotel.lankaQrMerchantId || "000000000012345",
    merchantName: hotel.hotelName,
    merchantCity: hotel.merchantCity || "Tangalle",
    mcc: "7011",
    amountLkr: amountLkr > 0 ? amountLkr : undefined,
    referenceId,
    isDynamic: true,
  });
}

// ============================================================================
// Subcomponents (Print & Preview Layout)
// ============================================================================

interface ThermalToolbarProps {
  readonly paperWidth: ThermalPaperWidth;
  readonly onWidthChange: (w: ThermalPaperWidth) => void;
  readonly onPrint?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}

function ThermalToolbar({ paperWidth, onWidthChange, onPrint, onClose }: ThermalToolbarProps) {
  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="no-print print:hidden w-full flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
          Interim Folio Slip
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onWidthChange(80)}
            className={`px-2.5 py-1 rounded-md transition ${
              paperWidth === 80
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            80mm Standard POS
          </button>
          <button
            type="button"
            onClick={() => onWidthChange(58)}
            className={`px-2.5 py-1 rounded-md transition ${
              paperWidth === 58
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            58mm Pocket
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 min-h-[44px]"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={handlePrintClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition shadow-md"
        >
          <span>🖨️</span>
          <span>Print Thermal Slip</span>
        </button>
      </div>
    </div>
  );
}

interface ThermalHeaderProps {
  readonly hotel: ThermalFolioHotelInfo;
  readonly guest: ThermalFolioGuestInfo;
  readonly cashierName: string;
  readonly timestamp: string;
}

function ThermalHeader({ hotel, guest, cashierName, timestamp }: ThermalHeaderProps) {
  return (
    <div className="text-center space-y-1">
      <h1 className="text-sm font-black uppercase tracking-tight text-black dark:text-white">
        {hotel.hotelName}
      </h1>
      <p className="text-[10px] text-zinc-600 dark:text-zinc-400">{hotel.address}</p>
      <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Tel: {hotel.phone}</p>

      {/* Statutory numbers */}
      <div className="text-[9px] font-mono text-zinc-500 pt-0.5">
        {hotel.sltdaRegNo && <span>License: {hotel.sltdaRegNo} • </span>}
        {hotel.tin && <span>TIN: {hotel.tin}</span>}
      </div>

      <div className="border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2" />

      {/* Slip Title */}
      <div className="font-extrabold text-xs uppercase tracking-wide text-black dark:text-white">
        INTERIM BILL / EXPRESS CHECK-OUT
      </div>
      <p className="text-[9px] text-zinc-500 italic">
        (Official Tax Invoice issued upon final departure)
      </p>

      <div className="border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2" />

      {/* Stay & Room Context */}
      <div className="text-[10px] text-left space-y-0.5">
        <div className="flex justify-between font-bold">
          <span className="text-xs">ROOM: {guest.roomNumber}</span>
          <span className="font-mono">FOLIO: {guest.folioId}</span>
        </div>
        <div className="font-medium text-black dark:text-white">GUEST: {guest.guestFullName}</div>
        <div className="flex justify-between font-mono text-zinc-600 dark:text-zinc-400 text-[9px]">
          <span>
            STAY: {guest.checkInDate} to {guest.checkOutDate} ({guest.nightsCount}N)
          </span>
          <span>PLAN: {guest.mealPlan}</span>
        </div>
        <div className="flex justify-between font-mono text-zinc-500 text-[9px]">
          <span>REF: {guest.bookingReference}</span>
          <span>PAX: {guest.adultsCount}A</span>
        </div>
        <div className="flex justify-between font-mono text-zinc-500 text-[9px] pt-0.5">
          <span>PRINTED: {timestamp}</span>
          <span>CASHIER: {cashierName}</span>
        </div>
      </div>
    </div>
  );
}

interface ThermalItemsProps {
  readonly lines: ReadonlyArray<ThermalFolioItemLine>;
}

function ThermalItems({ lines }: ThermalItemsProps) {
  return (
    <div>
      <div className="border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2" />
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 pb-1">
        <span>Description</span>
        <span>Amount (LKR)</span>
      </div>
      <div className="border-t border-zinc-300 dark:border-zinc-700 mb-1" />

      <div className="space-y-1 font-mono tabular-nums-lkr text-[10px]">
        {lines.map((line) => (
          <div key={line.id} className="flex justify-between items-start gap-1">
            <div className="text-left leading-tight font-sans">
              <span className="text-zinc-500 font-mono text-[9px] mr-1">{line.date}</span>
              <span className="text-black dark:text-white">{line.description}</span>
              {line.quantity > 1 && (
                <span className="text-zinc-500 text-[9px] block">Qty: {line.quantity}</span>
              )}
            </div>
            <div className="shrink-0 text-right font-medium text-black dark:text-white">
              {formatLkr(line.amountLkr)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ThermalTotalsProps {
  readonly tax: ThermalFolioTaxSummary;
  readonly payments: ReadonlyArray<ThermalFolioPaymentLine>;
}

function ThermalTotals({ tax, payments }: ThermalTotalsProps) {
  return (
    <div>
      <div className="border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2" />

      {/* Tax Compounding Breakdown */}
      <div className="space-y-0.5 font-mono tabular-nums-lkr text-[10px]">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Base Value of Supply:</span>
          <span>{formatLkr(tax.baseSupplyLkr)}</span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Service Charge (10%):</span>
          <span>{formatLkr(tax.serviceChargeLkr)}</span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>TDL (1%):</span>
          <span>{formatLkr(tax.tdlLkr)}</span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>SSCL (2.5%):</span>
          <span>{formatLkr(tax.ssclLkr)}</span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>VAT (18%):</span>
          <span>{formatLkr(tax.vatLkr)}</span>
        </div>

        <div className="border-t border-zinc-300 dark:border-zinc-700 my-1" />

        {/* Grand Total */}
        <div className="flex justify-between font-black text-xs text-black dark:text-white">
          <span>TOTAL CHARGES:</span>
          <span>{formatLkr(tax.grandTotalLkr)}</span>
        </div>

        {/* Payments Applied */}
        {payments.length > 0 && (
          <div className="pt-1 space-y-0.5 text-[9px] text-zinc-600 dark:text-zinc-400 border-t border-dashed border-zinc-300 dark:border-zinc-700 mt-1">
            <div className="font-bold uppercase text-[8px] tracking-wider text-zinc-500">
              Payments / Credits:
            </div>
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="truncate max-w-[170px]">{p.method}</span>
                <span>-{formatLkr(p.amountLkr)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400 pt-0.5">
              <span>Total Paid:</span>
              <span>-{formatLkr(tax.totalPaidLkr)}</span>
            </div>
          </div>
        )}

        <div className="border-t-2 border-zinc-900 dark:border-white my-1.5" />

        {/* Net Balance Payable */}
        <div className="flex justify-between items-center text-sm font-black text-black dark:text-white">
          <span>BALANCE DUE:</span>
          <span className="font-mono tabular-nums-lkr">{formatLkr(tax.balanceDueLkr)}</span>
        </div>

        {tax.indicativeUsdBalance > 0 && (
          <div className="text-right text-[9px] text-zinc-500">
            ≈ ${tax.indicativeUsdBalance.toFixed(2)} USD @ CBSL 305.50
          </div>
        )}
      </div>
    </div>
  );
}

interface ThermalQrScanProps {
  readonly qrSvgMarkup: string;
  readonly balanceLkr: number;
}

function ThermalQrScanSection({ qrSvgMarkup, balanceLkr }: ThermalQrScanProps) {
  if (balanceLkr <= 0) {
    return (
      <div className="text-center py-3 border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2 space-y-1">
        <div className="text-emerald-600 font-bold text-xs uppercase">✓ FOLIO FULLY SETTLED</div>
        <p className="text-[9px] text-zinc-500">
          No payment is due. Simply leave your key in the express drop box!
        </p>
      </div>
    );
  }

  return (
    <div className="text-center border-t border-dashed border-zinc-400 dark:border-zinc-600 my-2 pt-2 space-y-1.5">
      <div className="font-black text-[11px] uppercase tracking-wide text-black dark:text-white">
        SCAN &amp; PAY FROM YOUR ROOM
      </div>
      <p className="text-[9px] text-zinc-600 dark:text-zinc-400 leading-tight">
        Scan with any Sri Lankan Bank App (Q+, FriMi, WePay) or Alipay+
      </p>

      {/* Crisp 180x180 Vector QR SVG Container */}
      <div className="flex justify-center py-1">
        <div
          className="w-44 h-44 bg-white p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized SVG generated directly by internal qrSvg module
          dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
        />
      </div>

      <div className="text-[8px] text-zinc-500 font-mono">
        CBSL LankaQR • Exact Balance LKR {balanceLkr.toLocaleString("en-LK")}
      </div>

      {/* Trilingual instructions */}
      <div className="text-[8px] text-zinc-600 dark:text-zinc-400 space-y-0.5 pt-1">
        <div>ස්කෑන් කර ගෙවා පිටවන්න • ஸ்கேன் செய்து உடனடியாக பணம் செலுத்துங்கள்</div>
      </div>

      <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1" />

      <p className="text-[8px] text-zinc-500 italic">
        After paying via LankaQR, please deposit your room key in the express check-out box at
        reception. Have a pleasant onward journey in Sri Lanka!
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PrintableThermalFolio({
  hotel: partialHotel,
  guest: partialGuest,
  lines = DEFAULT_THERMAL_LINES,
  payments = DEFAULT_THERMAL_PAYMENTS,
  taxSummary: partialTax,
  onPrint,
  onClose,
  initialPaperWidth = 80,
  cashierName = "Front Desk (FO-08)",
  printTimestamp = "2026-10-19 11:30",
  className = "",
}: PrintableThermalFolioProps) {
  const containerId = useId();
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(initialPaperWidth);

  const hotel = useMemo<ThermalFolioHotelInfo>(() => {
    return {
      ...DEFAULT_THERMAL_HOTEL,
      ...(partialHotel ?? {}),
    };
  }, [partialHotel]);

  const guest = useMemo<ThermalFolioGuestInfo>(() => {
    return {
      ...DEFAULT_THERMAL_GUEST,
      ...(partialGuest ?? {}),
    };
  }, [partialGuest]);

  const tax = useMemo<ThermalFolioTaxSummary>(() => {
    if (partialTax?.grandTotalLkr !== undefined && partialTax?.balanceDueLkr !== undefined) {
      return {
        baseSupplyLkr: partialTax.baseSupplyLkr ?? 0,
        serviceChargeLkr: partialTax.serviceChargeLkr ?? 0,
        tdlLkr: partialTax.tdlLkr ?? 0,
        ssclLkr: partialTax.ssclLkr ?? 0,
        vatLkr: partialTax.vatLkr ?? 0,
        grandTotalLkr: partialTax.grandTotalLkr,
        totalPaidLkr: partialTax.totalPaidLkr ?? 0,
        balanceDueLkr: partialTax.balanceDueLkr,
        cbslUsdRateLkr: partialTax.cbslUsdRateLkr ?? 305.5,
        indicativeUsdBalance: partialTax.indicativeUsdBalance ?? 0,
      };
    }
    return computeThermalTaxTotals(lines, payments);
  }, [partialTax, lines, payments]);

  // Generate dynamic LankaQR payload and crisp monochrome SVG
  const lankaQrPayload = useMemo(() => {
    return generateThermalLankaQrPayload(hotel, tax.balanceDueLkr, guest.folioId);
  }, [hotel, tax.balanceDueLkr, guest.folioId]);

  const qrSvgMarkup = useMemo(() => {
    return generateQrSvg(lankaQrPayload, {
      size: 240,
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      moduleRadius: 0.5,
    });
  }, [lankaQrPayload]);

  const widthStyle = paperWidth === 58 ? "max-w-[240px]" : "max-w-[320px]";

  return (
    <div id={containerId} className={`w-full flex flex-col items-center ${className}`}>
      {/* On-Screen Action Toolbar */}
      <ThermalToolbar
        paperWidth={paperWidth}
        onWidthChange={setPaperWidth}
        onPrint={onPrint}
        onClose={onClose}
      />

      {/* 80mm / 58mm Thermal Receipt Container */}
      <div
        className={`w-full ${widthStyle} bg-white dark:bg-zinc-900 text-black dark:text-white p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none space-y-2 font-sans`}
      >
        {/* Receipt Header */}
        <ThermalHeader
          hotel={hotel}
          guest={guest}
          cashierName={cashierName}
          timestamp={printTimestamp}
        />

        {/* Itemized Lines */}
        <ThermalItems lines={lines} />

        {/* Tax Walk & Net Balance Totals */}
        <ThermalTotals tax={tax} payments={payments} />

        {/* Embedded LankaQR Scan & Pay Block */}
        <ThermalQrScanSection qrSvgMarkup={qrSvgMarkup} balanceLkr={tax.balanceDueLkr} />
      </div>
    </div>
  );
}
