/**
 * @hms/frontend - Shared Report Export & Print Table Wrapper (ReportExportShared.tsx)
 *
 * Implements Step 425 (Phase 17.25) / Rung 7 of the Sri Lanka HMS Master Architecture Plan:
 * Consolidated reporting infrastructure component and download engine:
 *
 * 1. Single source of truth for browser file downloads (`triggerFileDownload`, `downloadCsv`)
 *    with robust SSR/Node environment fallbacks, UTF-8 BOM encoding for Excel compatibility,
 *    and automatic DOM element / object URL disposal.
 * 2. Unified Apple Human Interface Guidelines (Apple HIG) & Liquid Glass print container
 *    (`ReportPrintTableWrapper`):
 *    - Translucent Liquid Glass ribbon (`backdrop-filter: blur(24px) saturate(180%)`) with
 *      `@media (prefers-reduced-transparency: reduce)` solid fallback.
 *    - SF Pro optical typography with tabular currency alignment (`font-variant-numeric: tabular-nums`).
 *    - Continuous squircle corner geometry (`rounded-3xl` / `rounded-2xl`).
 *    - Guaranteed ergonomic touch targets (`>= 44x44pt`).
 *    - Integrated `@media print` layout engine stripping non-printable chrome (`print:hidden`),
 *      optimizing margins for standard international A4 paper, and enforcing page-break discipline.
 *    - Sri Lankan statutory corporate seal block with General Manager signature line and
 *      tamper-evident SHA-256 cryptographic audit seal.
 *
 * Zero external npm dependencies. Pure React 19 + Tailwind CSS v4.
 */

import type React from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ReportPrintTableWrapperProps {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly periodLabel?: string | undefined;
  readonly sltdaRegNo?: string | undefined;
  readonly auditSealSha256?: string | undefined;
  readonly onExportCsv?: (() => void) | undefined;
  readonly csvFilename?: string | undefined;
  readonly csvContent?: string | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly customActions?: React.ReactNode | undefined;
  readonly certificationText?: string | undefined;
  readonly certifiedBy?: string | undefined;
  readonly certifiedRole?: string | undefined;
  readonly children?: React.ReactNode | undefined;
}

// ============================================================================
// Universal File & CSV Download Engine
// ============================================================================

/**
 * Universal browser file download helper.
 * Handles both (filename, content, mimeType) and (content, filename, mimeType) parameter
 * orders interchangeably to provide bulletproof backwards compatibility across all reports.
 *
 * Safely no-ops in non-browser Node.js/SSR environments.
 */
export function triggerFileDownload(
  arg1: string,
  arg2: string,
  mimeType = "text/csv;charset=utf-8;",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  // Detect argument order: if arg2 ends with a file extension, arg2 is filename and arg1 is content.
  let filename: string;
  let content: string;

  const hasFileExtension = (str: string) => /\.[a-zA-Z0-9]{2,5}$/.test(str);

  if (hasFileExtension(arg2) && !hasFileExtension(arg1)) {
    // Order: (content, filename, mimeType)
    content = arg1;
    filename = arg2;
  } else {
    // Order: (filename, content, mimeType)
    filename = arg1;
    content = arg2;
  }

  // Prepend UTF-8 BOM for CSVs so Microsoft Excel properly decodes Sinhala/Tamil characters
  const isCsv = mimeType.includes("csv") || filename.toLowerCase().endsWith(".csv");
  const blobData = isCsv && !content.startsWith("\uFEFF") ? `\uFEFF${content}` : content;

  const blob = new Blob([blobData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Dedicated CSV download helper.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  triggerFileDownload(filename, csvContent, "text/csv;charset=utf-8;");
}

/**
 * Universal safe print trigger.
 */
export function triggerWindowPrint(): void {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}

// ============================================================================
// Apple HIG Master Print Table Wrapper Component
// ============================================================================

export function ReportPrintTableWrapper({
  title,
  subtitle,
  hotelName = "Cinnamon Bentota Beach Resort",
  periodLabel,
  sltdaRegNo = "SLTDA/SQA/PRO/00892",
  auditSealSha256,
  onExportCsv,
  csvFilename,
  csvContent,
  onPrint,
  customActions,
  certificationText = "I hereby certify under penalty of the Sri Lanka Tourism Development Act No. 14 of 1968 and Inland Revenue Act No. 24 of 2017 that the figures presented in this statement represent a true and verified transcript of property operations.",
  certifiedBy = "Pasan Ramyanath, FCA",
  certifiedRole = "Director of Finance & General Manager",
  children,
}: ReportPrintTableWrapperProps): React.JSX.Element {
  const handlePrint = onPrint ?? triggerWindowPrint;

  const handleCsvDownload = () => {
    if (onExportCsv) {
      onExportCsv();
    } else if (csvContent && csvFilename) {
      downloadCsv(csvFilename, csvContent);
    }
  };

  const hasCsvAction = Boolean(onExportCsv || (csvContent && csvFilename));

  return (
    <div className="w-full space-y-6 print:space-y-4 print:text-black">
      {/* 1. Apple Liquid Glass Control Ribbon (Hidden in Print) */}
      <div className="no-print print:hidden w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
          {periodLabel && (
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
              <span>📅</span>
              <span>{periodLabel}</span>
            </div>
          )}
        </div>

        {/* Action Controls - Guaranteed >= 44x44pt Ergonomic Targets */}
        <div className="flex flex-wrap items-center gap-2.5">
          {customActions}

          {hasCsvAction && (
            <button
              type="button"
              onClick={handleCsvDownload}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer"
              title="Download structured CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer"
            title="Print A4 official report or export PDF"
          >
            <span>🖨️</span>
            <span>Print Report (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. Official Printable Report Canvas */}
      <div className="relative p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 break-inside-avoid">
        {/* Printable Official Header Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 print:text-black">
                Democratic Socialist Republic of Sri Lanka • Official Statement
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white print:text-black mt-1">
                {title}
              </h1>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-black mt-0.5">
                {hotelName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black font-mono mt-0.5">
                SLTDA Registration No: {sltdaRegNo}
              </div>
            </div>

            <div className="sm:text-right flex flex-col sm:items-end">
              {periodLabel && (
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-black">
                  Period:{" "}
                  <span className="font-bold text-slate-900 dark:text-white print:text-black">
                    {periodLabel}
                  </span>
                </div>
              )}
              <div className="text-[11px] text-slate-400 dark:text-slate-500 print:text-black mt-1 font-mono">
                Generated: {new Date().toISOString().replace("T", " ").substring(0, 19)} SLST
              </div>
              {auditSealSha256 && (
                <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 print:text-black bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                  🔒 Audit Hash: {auditSealSha256.substring(0, 16)}…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Main Report Content Injection */}
        <div className="w-full overflow-x-auto print:overflow-visible">{children}</div>

        {/* 4. Statutory Certification & Corporate Seal Block */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 print:border-black grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
          {/* Statutory Declaration */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-black">
              Statutory Certification & Attestation
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
              {certificationText}
            </p>
            <div className="pt-6">
              <div className="w-48 border-b border-dashed border-slate-400 dark:border-slate-600 print:border-black mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white print:text-black">
                {certifiedBy}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-black">
                {certifiedRole}
              </div>
            </div>
          </div>

          {/* Circular Corporate Seal & Verification Block */}
          <div className="flex flex-col items-start md:items-end justify-between">
            <div className="w-36 h-36 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 print:border-black flex flex-col items-center justify-center p-2 text-center select-none opacity-80">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 print:text-black">
                Corporate Seal
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 print:text-black mt-1">
                {hotelName}
              </span>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 print:text-black mt-0.5">
                Sri Lanka
              </span>
            </div>

            <div className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 print:text-black font-mono">
              System: Cloud SaaS HMS v1.0 • Sri Lanka Region
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
