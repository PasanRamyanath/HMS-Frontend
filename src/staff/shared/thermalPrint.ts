/**
 * Shared 80mm ESC/POS Thermal Printing Helpers (thermalPrint.ts)
 *
 * Provides unified receipt, KOT slip, and Z-report printing utilities for
 * Bluetooth & Wi-Fi ESC/POS 80mm thermal receipt printers across KDS and POS.
 *
 * Standards:
 * - 80mm thermal paper standard (72mm printable area / ~48 ASCII columns at standard font)
 * - Safe browser print invocation with after-print callback support
 * - Deterministic monospace column formatting and line padding
 * - Zero console or debugger noise & cognitive complexity <= 12 per function
 */

// ============================================================================
// Constants
// ============================================================================

/** Standard printable character width for 80mm ESC/POS thermal printer rolls. */
export const THERMAL_80MM_COLUMN_WIDTH = 48;

/** Narrow character width for compact 58mm or sub-column thermal layouts. */
export const THERMAL_58MM_COLUMN_WIDTH = 32;

/**
 * Standard CSS rules to enforce zero margins and crisp monochrome 80mm thermal printouts.
 */
export const THERMAL_80MM_PRINT_STYLES = `
 @media print {
 @page {
 margin: 0;
 size: 80mm auto;
 }
 html, body {
 margin: 0 !important;
 padding: 0 !important;
 background: #FFFFFF !important;
 color: #000000 !important;
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 }
 .no-print, [data-no-print="true"] {
 display: none !important;
 }
 .thermal-receipt-container {
 width: 72mm !important;
 max-width: 72mm !important;
 margin: 0 auto !important;
 padding: 2mm !important;
 font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
 font-size: 11px !important;
 line-height: 1.25 !important;
 color: #000000 !important;
 page-break-inside: avoid !important;
 break-inside: avoid !important;
 }
 }
`.trim();

// ============================================================================
// Printing Triggers
// ============================================================================

/**
 * Safely triggers browser print dialog with optional after-print cleanup callback.
 * Gracefully handles server-side environments and headless test runners.
 */
export function triggerThermalPrint(onAfterPrint?: (() => void) | undefined): boolean {
 if (typeof window === "undefined" || typeof window.print !== "function") {
 if (onAfterPrint) {
 onAfterPrint();
 }
 return false;
 }

 if (onAfterPrint) {
 const handleAfterPrint = () => {
 window.removeEventListener("afterprint", handleAfterPrint);
 onAfterPrint();
 };
 window.addEventListener("afterprint", handleAfterPrint, { once: true });
 }

 try {
 window.print();
 return true;
 } catch {
 return false;
 }
}

// ============================================================================
// Monospace Formatting Pure Helpers
// ============================================================================

/**
 * Formats an ISO timestamp or date object into a clean standard receipt timestamp.
 * Example output: "2026-10-20 14:30:00"
 */
export function formatThermalTimestamp(isoOrDate?: string | Date | undefined): string {
 if (!isoOrDate) {
 const now = new Date();
 return now.toISOString().replace("T", " ").substring(0, 19);
 }

 const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
 if (Number.isNaN(date.getTime())) {
 return typeof isoOrDate === "string" ? isoOrDate : "";
 }

 return date.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Formats an LKR amount into integer-cent formatted string for receipts.
 * Example: 15450.5 -> "15,450.50"
 */
export function formatThermalCurrency(amountLkr: number): string {
 if (!Number.isFinite(amountLkr)) {
 return "0.00";
 }
 const rounded = Math.round((amountLkr + Number.EPSILON) * 100) / 100;
 return rounded.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 });
}

/**
 * Generates an ASCII horizontal line divider of specified width and character.
 */
export function generateReceiptDivider(char = "-", width = THERMAL_80MM_COLUMN_WIDTH): string {
 const safeChar = char.length > 0 ? char.charAt(0) : "-";
 const safeWidth = Math.max(1, Math.min(width, 120));
 return safeChar.repeat(safeWidth);
}

/**
 * Formats a two-column line where left text is left-aligned and right text is right-aligned.
 * If text exceeds the column width, right text is preserved and left is truncated with ellipsis.
 */
export function padReceiptLine(
 left: string,
 right: string,
 width = THERMAL_80MM_COLUMN_WIDTH,
): string {
 const safeWidth = Math.max(10, width);
 const rightClean = right.trim();
 const leftClean = left.trim();

 const spaceNeeded = safeWidth - rightClean.length;
 if (spaceNeeded <= 0) {
 return `${leftClean.slice(0, 6)}... ${rightClean}`;
 }

 if (leftClean.length > spaceNeeded - 1) {
 const truncatedLeft = `${leftClean.slice(0, spaceNeeded - 4)}...`;
 return `${truncatedLeft.padEnd(spaceNeeded, " ")}${rightClean}`;
 }

 return `${leftClean.padEnd(spaceNeeded, " ")}${rightClean}`;
}

/**
 * Centers text within the specified column width.
 */
export function centerReceiptText(text: string, width = THERMAL_80MM_COLUMN_WIDTH): string {
 const safeWidth = Math.max(10, width);
 const trimmed = text.trim();
 if (trimmed.length >= safeWidth) {
 return trimmed;
 }
 const leftPadding = Math.floor((safeWidth - trimmed.length) / 2);
 const rightPadding = safeWidth - trimmed.length - leftPadding;
 return `${" ".repeat(leftPadding)}${trimmed}${" ".repeat(rightPadding)}`;
}
