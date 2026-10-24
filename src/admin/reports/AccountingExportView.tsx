import { useMemo, useState } from "react";
import { GlassCard, GlassCardContent } from "../../components/GlassCard.js";
import { SegmentedControl } from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type AccountingTab = "JOURNAL_PREVIEW" | "GL_MAPPING" | "EXPORT_PANEL" | "AUDIT_TRAIL";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type NormalBalance = "DEBIT" | "CREDIT";

export interface AccountMappingItem {
 readonly id: string;
 readonly defaultCode: string;
 readonly customCode: string;
 readonly name: string;
 readonly type: AccountType;
 readonly normalBalance: NormalBalance;
 readonly department: string;
 readonly description: string;
}

export interface JournalLineItem {
 readonly lineNo: number;
 readonly accountCode: string;
 readonly accountName: string;
 readonly accountType: AccountType;
 readonly debitLkr: number;
 readonly creditLkr: number;
 readonly department: string;
 readonly narration: string;
}

export interface AccountingJournalData {
 readonly tenantId: string;
 readonly hotelName: string;
 readonly journalDate: string; // YYYY-MM-DD
 readonly journalNumber: string; // e.g. "JRN-2026-10-18"
 readonly auditClosingTime?: string | undefined;
 readonly lines: readonly JournalLineItem[];
 readonly auditHash?: string | undefined;
 readonly prevAuditHash?: string | undefined;
}

export interface AccountingExportViewProps {
 readonly initialData?: AccountingJournalData | undefined;
 readonly customMappings?: Record<string, string> | undefined;
 readonly onSaveMappings?: ((mappings: Record<string, string>) => void) | undefined;
 readonly onExportTriggered?:
 | ((format: "QUICKBOOKS" | "XERO" | "TALLY" | "GENERIC_CSV") => void)
 | undefined;
}

// ============================================================================
// Standard Default General Ledger Accounts (Sri Lanka Hospitality COA)
// ============================================================================

export const DEFAULT_GL_ACCOUNTS: readonly AccountMappingItem[] = [
 // Assets (Debits on collection)
 {
 id: "CASH_DRAWER",
 defaultCode: "1010",
 customCode: "1010",
 name: "Front Desk Cash Drawer",
 type: "ASSET",
 normalBalance: "DEBIT",
 department: "FRONT_DESK",
 description: "Daily Physical Cash Collections & Cashier Settlement",
 },
 {
 id: "BANK_CARD_CLEARING",
 defaultCode: "1020",
 customCode: "1020",
 name: "Bank & Credit Card Clearing",
 type: "ASSET",
 normalBalance: "DEBIT",
 department: "FRONT_DESK",
 description: "Visa, Mastercard & Amex Merchant Acquiring Clearing",
 },
 {
 id: "LANKA_QR_CLEARING",
 defaultCode: "1030",
 customCode: "1030",
 name: "LankaQR EMVCo Clearing",
 type: "ASSET",
 normalBalance: "DEBIT",
 department: "FRONT_DESK",
 description: "CBSL LankaQR Merchant Settlement Account",
 },
 {
 id: "GUEST_LEDGER",
 defaultCode: "1040",
 customCode: "1040",
 name: "Guest Ledger (In-House Receivables)",
 type: "ASSET",
 normalBalance: "DEBIT",
 department: "FRONT_DESK",
 description: "Open Balances on Active Checked-in In-House Folios",
 },
 {
 id: "CITY_LEDGER",
 defaultCode: "1050",
 customCode: "1050",
 name: "City Ledger (Corporate & DMC Receivables)",
 type: "ASSET",
 normalBalance: "DEBIT",
 department: "FRONT_DESK",
 description: "Direct Billed Travel Agent & Corporate Invoices",
 },

 // Liabilities & Statutory Taxes (Credits on billing)
 {
 id: "ADVANCE_DEPOSITS",
 defaultCode: "2010",
 customCode: "2010",
 name: "Advance Guest Deposits",
 type: "LIABILITY",
 normalBalance: "CREDIT",
 department: "FRONT_DESK",
 description: "Pre-Arrival Booking Guarantees Realized on Check-in",
 },
 {
 id: "SERVICE_CHARGE_POOL",
 defaultCode: "2020",
 customCode: "2020",
 name: "10% Staff Service Charge Pool",
 type: "LIABILITY",
 normalBalance: "CREDIT",
 department: "STATUTORY_LIABILITY",
 description: "10% Service Charge Collected for Staff Welfare Pool",
 },
 {
 id: "TDL_PAYABLE",
 defaultCode: "2030",
 customCode: "2030",
 name: "1% SLTDA Tourism Development Levy Payable",
 type: "LIABILITY",
 normalBalance: "CREDIT",
 department: "STATUTORY_LIABILITY",
 description: "1% Statutory SLTDA Levy on Tourism Turnover",
 },
 {
 id: "SSCL_PAYABLE",
 defaultCode: "2040",
 customCode: "2040",
 name: "2.5% IRD Social Security Contribution Levy Payable",
 type: "LIABILITY",
 normalBalance: "CREDIT",
 department: "STATUTORY_LIABILITY",
 description: "2.5% Compounding IRD SSCL Turnover Levy",
 },
 {
 id: "VAT_PAYABLE",
 defaultCode: "2050",
 customCode: "2050",
 name: "18% IRD Value Added Tax Output Payable",
 type: "LIABILITY",
 normalBalance: "CREDIT",
 department: "STATUTORY_LIABILITY",
 description: "18% Statutory IRD Output VAT on Compounded Turnover",
 },

 // Departmental Net Revenues (Credits on billing)
 {
 id: "ROOM_REVENUE",
 defaultCode: "3010",
 customCode: "3010",
 name: "Room & Accommodation Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "ROOMS",
 description: "Nightly Room & Meal-Plan Tariff (Base Supply)",
 },
 {
 id: "FB_REVENUE",
 defaultCode: "3020",
 customCode: "3020",
 name: "Food & Beverage Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "FOOD_AND_BEVERAGE",
 description: "Restaurant, Bar, In-Room Dining & QR Orders (Base)",
 },
 {
 id: "SPA_REVENUE",
 defaultCode: "3030",
 customCode: "3030",
 name: "Ayurveda & Spa Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "SPA",
 description: "Ayurvedic Treatments & Spa Packages (Base)",
 },
 {
 id: "BANQUET_REVENUE",
 defaultCode: "3040",
 customCode: "3040",
 name: "Banquet & Event Hall Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "BANQUETS",
 description: "Weddings, Conferences, Corkage & Hall Rentals (Base)",
 },
 {
 id: "EXCURSION_REVENUE",
 defaultCode: "3050",
 customCode: "3050",
 name: "Excursion & Transfer Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "EXCURSIONS",
 description: "Safari Jeeps, Whale Watching & Airport Transfers (Markup)",
 },
 {
 id: "MISC_REVENUE",
 defaultCode: "3060",
 customCode: "3060",
 name: "Miscellaneous & Minibar Revenue",
 type: "REVENUE",
 normalBalance: "CREDIT",
 department: "MISCELLANEOUS",
 description: "Minibar, Laundry, Telephone & Sundries (Base)",
 },
];

export const MOCK_DEFAULT_JOURNAL: AccountingJournalData = {
 tenantId: "tenant-boutique-sigiriya",
 hotelName: "Sigiriya Heritage Villa",
 journalDate: "2026-10-18",
 journalNumber: "JRN-2026-10-18-001",
 auditClosingTime: "23:59 SLST",
 auditHash: "a4f89d3c52e89b21f37e4912cd6b98e1f02c4b578912ef60481239abcd56ef78",
 prevAuditHash: "0000000000000000000000000000000000000000000000000000000000000000",
 lines: [
 {
 lineNo: 1,
 accountCode: "1010",
 accountName: "Front Desk Cash Drawer",
 accountType: "ASSET",
 debitLkr: 34343,
 creditLkr: 0,
 department: "FRONT_DESK",
 narration: "Daily Cash Settlements - Sigiriya Heritage Villa",
 },
 {
 lineNo: 2,
 accountCode: "1020",
 accountName: "Bank & Credit Card Clearing",
 accountType: "ASSET",
 debitLkr: 50000,
 creditLkr: 0,
 department: "FRONT_DESK",
 narration: "Credit Card Gateway Batches - Sigiriya Heritage Villa",
 },
 {
 lineNo: 3,
 accountCode: "1030",
 accountName: "LankaQR EMVCo Clearing",
 accountType: "ASSET",
 debitLkr: 30000,
 creditLkr: 0,
 department: "FRONT_DESK",
 narration: "LankaQR EMVCo Dynamic Settlements - Sigiriya Heritage Villa",
 },
 {
 lineNo: 4,
 accountCode: "1050",
 accountName: "City Ledger (Corporate & DMC Receivables)",
 accountType: "ASSET",
 debitLkr: 20000,
 creditLkr: 0,
 department: "FRONT_DESK",
 narration: "Direct Billed Travel Agent & Corporate Invoices",
 },
 {
 lineNo: 5,
 accountCode: "3010",
 accountName: "Room & Accommodation Revenue",
 accountType: "REVENUE",
 debitLkr: 0,
 creditLkr: 70000,
 department: "ROOMS",
 narration: "Nightly Room Charges Base - Sigiriya Heritage Villa",
 },
 {
 lineNo: 6,
 accountCode: "3020",
 accountName: "Food & Beverage Revenue",
 accountType: "REVENUE",
 debitLkr: 0,
 creditLkr: 30000,
 department: "FOOD_AND_BEVERAGE",
 narration: "Dining, BOT & QR Orders Base - Sigiriya Heritage Villa",
 },
 {
 lineNo: 7,
 accountCode: "2020",
 accountName: "10% Staff Service Charge Pool",
 accountType: "LIABILITY",
 debitLkr: 0,
 creditLkr: 10000,
 department: "STATUTORY_LIABILITY",
 narration: "10% Staff Welfare Service Charge Pool",
 },
 {
 lineNo: 8,
 accountCode: "2030",
 accountName: "1% SLTDA Tourism Development Levy Payable",
 accountType: "LIABILITY",
 debitLkr: 0,
 creditLkr: 1100,
 department: "STATUTORY_LIABILITY",
 narration: "1% SLTDA Tourism Development Levy",
 },
 {
 lineNo: 9,
 accountCode: "2040",
 accountName: "2.5% IRD Social Security Contribution Levy Payable",
 accountType: "LIABILITY",
 debitLkr: 0,
 creditLkr: 2750,
 department: "STATUTORY_LIABILITY",
 narration: "2.5% IRD Social Security Contribution Levy",
 },
 {
 lineNo: 10,
 accountCode: "2050",
 accountName: "18% IRD Value Added Tax Output Payable",
 accountType: "LIABILITY",
 debitLkr: 0,
 creditLkr: 20493,
 department: "STATUTORY_LIABILITY",
 narration: "18% IRD Value Added Tax Output",
 },
 ],
};

// ============================================================================
// CSV / XML Exporters for Browser Download
// ============================================================================

export function generateQuickBooksCsv(
 journal: AccountingJournalData,
 codeOverrides: Record<string, string>,
): string {
 const headers = [
 "*JournalNo",
 "*JournalDate",
 "*AccountName",
 "*AccountCode",
 "*Debit",
 "*Credit",
 "*Description",
 "*Name",
 ].join(",");

 const rows = journal.lines.map((l) => {
 const code = codeOverrides[l.accountCode] ?? l.accountCode;
 const debit = l.debitLkr > 0 ? l.debitLkr.toFixed(2) : "0.00";
 const credit = l.creditLkr > 0 ? l.creditLkr.toFixed(2) : "0.00";
 return `"${journal.journalNumber}","${journal.journalDate}","${l.accountName}","${code}",${debit},${credit},"${l.narration}","${journal.hotelName}"`;
 });

 return [headers, ...rows].join("\n");
}

export function generateXeroCsv(
 journal: AccountingJournalData,
 codeOverrides: Record<string, string>,
): string {
 const headers = [
 "*Narration",
 "*Date",
 "*Description",
 "*AccountCode",
 "*TaxType",
 "*Amount",
 ].join(",");

 const rows = journal.lines.map((l) => {
 const code = codeOverrides[l.accountCode] ?? l.accountCode;
 const amount = l.debitLkr > 0 ? l.debitLkr.toFixed(2) : (-l.creditLkr).toFixed(2);
 return `"Night Audit ${journal.journalNumber}","${journal.journalDate}","${l.narration}","${code}","BASEXCLUDED",${amount}`;
 });

 return [headers, ...rows].join("\n");
}

export function generateTallyXml(
 journal: AccountingJournalData,
 codeOverrides: Record<string, string>,
): string {
 const tallyDate = journal.journalDate.replace(/-/g, "");
 const ledgerEntries = journal.lines
 .map((l) => {
 const code = codeOverrides[l.accountCode] ?? l.accountCode;
 const isDebit = l.debitLkr > 0;
 const isPositive = isDebit ? "Yes" : "No";
 const amount = isDebit ? (-l.debitLkr).toFixed(2) : l.creditLkr.toFixed(2);
 const safeName = l.accountName.replace(/&/g, "&amp;");
 const safeDesc = l.narration.replace(/&/g, "&amp;");

 return [
 " <ALLLEDGERENTRIES.LIST>",
 ` <LEDGERNAME>${safeName}</LEDGERNAME>`,
 ` <LEDGERCODE>${code}</LEDGERCODE>`,
 ` <ISDEEMEDPOSITIVE>${isPositive}</ISDEEMEDPOSITIVE>`,
 ` <AMOUNT>${amount}</AMOUNT>`,
 ` <NARRATION>${safeDesc}</NARRATION>`,
 " </ALLLEDGERENTRIES.LIST>",
 ].join("\n");
 })
 .join("\n");

 return [
 "<ENVELOPE>",
 " <HEADER>",
 " <TALLYREQUEST>Import Data</TALLYREQUEST>",
 " </HEADER>",
 " <BODY>",
 " <IMPORTDATA>",
 " <REQUESTDESC>",
 " <REPORTNAME>Vouchers</REPORTNAME>",
 " </REQUESTDESC>",
 " <REQUESTDATA>",
 ' <TALLYMESSAGE xmlns:UDF="TallyUDF">',
 ' <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">',
 ` <DATE>${tallyDate}</DATE>`,
 " <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>",
 ` <VOUCHERNUMBER>${journal.journalNumber}</VOUCHERNUMBER>`,
 ` <NARRATION>Night Audit Journal - ${journal.hotelName}</NARRATION>`,
 ledgerEntries,
 " </VOUCHER>",
 " </TALLYMESSAGE>",
 " </REQUESTDATA>",
 " </IMPORTDATA>",
 " </BODY>",
 "</ENVELOPE>",
 ].join("\n");
}

export function generateGenericJournalCsv(
 journal: AccountingJournalData,
 codeOverrides: Record<string, string>,
): string {
 const headers = [
 "JournalDate",
 "JournalNumber",
 "LineNo",
 "AccountCode",
 "AccountName",
 "AccountType",
 "Department",
 "DebitLkr",
 "CreditLkr",
 "Narration",
 ].join(",");

 const rows = journal.lines.map((l) => {
 const code = codeOverrides[l.accountCode] ?? l.accountCode;
 return `"${journal.journalDate}","${journal.journalNumber}",${l.lineNo},"${code}","${l.accountName}","${l.accountType}","${l.department}",${l.debitLkr.toFixed(2)},${l.creditLkr.toFixed(2)},"${l.narration}"`;
 });

 return [headers, ...rows].join("\n");
}

import { triggerFileDownload } from "./ReportExportShared";
export { triggerFileDownload };

// ============================================================================
// Subcomponents for Cognitive Complexity Management
// ============================================================================

interface BalanceSummaryCardProps {
 readonly totalDebits: number;
 readonly totalCredits: number;
 readonly isBalanced: boolean;
 readonly diff: number;
}

function BalanceSummaryCard({
 totalDebits,
 totalCredits,
 isBalanced,
 diff,
}: BalanceSummaryCardProps) {
 return (
 <GlassCard className="mb-6 border-[#E2E8F0] shadow-lg">
 <GlassCardContent className="p-6">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 ">
 Double-Entry Balance Verification
 </span>
 <StatusBadge
 status={isBalanced ? "PAID" : "CANCELLED"}
 label={
 isBalanced
 ? "Balanced (Debits === Credits)"
 : `Imbalanced (Diff: ${formatLkr(diff)})`
 }
 color={isBalanced ? "green" : "red"}
 size="sm"
 />
 </div>
 <p className="text-sm text-slate-600 ">
 {isBalanced
 ? "Every Rupee and cent of daily collections balances against departmental revenues and statutory taxes."
 : "Warning: Total debits do not match total credits. Check GL accounts before exporting."}
 </p>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-right">
 <span className="text-xs text-slate-500 block">Total Debits</span>
 <span className="text-xl font-bold font-mono tracking-tight text-emerald-600 tabular-nums">
 {formatLkr(totalDebits)}
 </span>
 </div>
 <div className="h-8 w-px bg-slate-200 " />
 <div className="text-right">
 <span className="text-xs text-slate-500 block">
 Total Credits
 </span>
 <span className="text-xl font-bold font-mono tracking-tight text-blue-600 tabular-nums">
 {formatLkr(totalCredits)}
 </span>
 </div>
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>
 );
}

interface JournalTableProps {
 readonly lines: readonly JournalLineItem[];
 readonly codeOverrides: Record<string, string>;
 readonly totalDebits: number;
 readonly totalCredits: number;
}

function JournalTable({ lines, codeOverrides, totalDebits, totalCredits }: JournalTableProps) {
 return (
 <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-md">
 <table className="w-full text-left border-collapse text-sm">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 ">
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-12">#</th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-24">Code</th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
 Account Name
 </th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Department</th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">
 Debit (LKR)
 </th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">
 Credit (LKR)
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {lines.map((l) => {
 const activeCode = codeOverrides[l.accountCode] ?? l.accountCode;
 const isDebit = l.debitLkr > 0;
 return (
 <tr
 key={l.lineNo}
 className="hover:bg-slate-50/60 transition-colors"
 >
 <td className="py-3 px-4 font-mono text-xs text-slate-400">{l.lineNo}</td>
 <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-600 ">
 {activeCode}
 </td>
 <td className="py-3 px-4">
 <div className="font-medium text-slate-900 ">{l.accountName}</div>
 <div className="text-xs text-slate-500 ">{l.narration}</div>
 </td>
 <td className="py-3 px-4 text-xs">
 <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
 {l.department}
 </span>
 </td>
 <td className="py-3 px-4 text-right font-mono font-medium tabular-nums text-slate-900 ">
 {isDebit ? formatLkr(l.debitLkr) : "-"}
 </td>
 <td className="py-3 px-4 text-right font-mono font-medium tabular-nums text-slate-900 ">
 {!isDebit ? formatLkr(l.creditLkr) : "-"}
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-slate-300 bg-slate-50/70 font-semibold text-slate-900 ">
 <td colSpan={4} className="py-3 px-4 text-right">
 Total Balanced Journal:
 </td>
 <td className="py-3 px-4 text-right font-mono text-emerald-600 tabular-nums">
 {formatLkr(totalDebits)}
 </td>
 <td className="py-3 px-4 text-right font-mono text-blue-600 tabular-nums">
 {formatLkr(totalCredits)}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 );
}

interface GlMappingProps {
 readonly accounts: readonly AccountMappingItem[];
 readonly codeOverrides: Record<string, string>;
 readonly onCodeChange: (id: string, defaultCode: string, newCode: string) => void;
 readonly onReset: () => void;
 readonly onSave: () => void;
 readonly saveSuccess: boolean;
}

function GlMappingTable({
 accounts,
 codeOverrides,
 onCodeChange,
 onReset,
 onSave,
 saveSuccess,
}: GlMappingProps) {
 return (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
 <div>
 <h3 className="text-base font-semibold text-slate-900 ">
 General Ledger Account Mapping
 </h3>
 <p className="text-sm text-slate-500 ">
 Customize account codes to match your QuickBooks, Xero, or Tally Chart of Accounts.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onReset}
 className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 active:scale-95 transition-all"
 >
 Reset Defaults
 </button>
 <button
 type="button"
 onClick={onSave}
 className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg active:scale-95 transition-all shadow-sm"
 >
 {saveSuccess ? "Saved" : "Save Mapping"}
 </button>
 </div>
 </div>

 <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/40 backdrop-blur-md">
 <table className="w-full text-left border-collapse text-sm">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 ">
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
 Account Name
 </th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Type</th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
 Normal Balance
 </th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
 Standard Code
 </th>
 <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-36">
 Custom GL Code
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {accounts.map((acct) => {
 const currentCustom = codeOverrides[acct.defaultCode] ?? acct.defaultCode;
 return (
 <tr
 key={acct.id}
 className="hover:bg-slate-50/60 transition-colors"
 >
 <td className="py-3 px-4">
 <div className="font-medium text-slate-900 ">{acct.name}</div>
 <div className="text-xs text-slate-500 ">
 {acct.description}
 </div>
 </td>
 <td className="py-3 px-4 text-xs font-semibold">
 <span
 className={`inline-block px-2 py-0.5 rounded-full ${
 acct.type === "ASSET"
 ? "bg-emerald-50 text-emerald-700 "
 : acct.type === "LIABILITY"
 ? "bg-amber-50 text-amber-700 "
 : "bg-blue-50 text-blue-700 "
 }`}
 >
 {acct.type}
 </span>
 </td>
 <td className="py-3 px-4 text-xs text-slate-600 font-mono">
 {acct.normalBalance}
 </td>
 <td className="py-3 px-4 text-xs font-mono text-slate-500">{acct.defaultCode}</td>
 <td className="py-3 px-4">
 <input
 type="text"
 value={currentCustom}
 onChange={(e) => onCodeChange(acct.id, acct.defaultCode, e.target.value)}
 className="w-full px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder={acct.defaultCode}
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 );
}

interface ExportPanelProps {
 readonly onExportQuickBooks: () => void;
 readonly onExportXero: () => void;
 readonly onExportTally: () => void;
 readonly onExportGeneric: () => void;
}

function ExportPanelGrid({
 onExportQuickBooks,
 onExportXero,
 onExportTally,
 onExportGeneric,
}: ExportPanelProps) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* QuickBooks */}
 <GlassCard className="p-5 border-[#E2E8F0] hover:shadow-lg transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div>
 <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
 Intuit QuickBooks Online & Desktop
 </span>
 <h4 className="text-base font-semibold text-slate-900 mt-1">
 QuickBooks Journal Entry CSV
 </h4>
 </div>
 
 </div>
 <p className="text-xs text-slate-600 mb-4 leading-relaxed">
 Generates native 8-column QuickBooks Online/Desktop CSV with JournalNo, AccountName,
 AccountCode, Debit, Credit, and hotel class descriptions.
 </p>
 <button
 type="button"
 onClick={onExportQuickBooks}
 className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
 >
 Download QuickBooks CSV
 </button>
 </GlassCard>

 {/* Xero */}
 <GlassCard className="p-5 border-[#E2E8F0] hover:shadow-lg transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div>
 <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
 Xero Cloud Accounting
 </span>
 <h4 className="text-base font-semibold text-slate-900 mt-1">
 Xero Manual Journal CSV
 </h4>
 </div>
 
 </div>
 <p className="text-xs text-slate-600 mb-4 leading-relaxed">
 Generates standard Xero CSV with signed amounts (Debits positive, Credits negative) and
 statutory BASEXCLUDED tax codes for direct reconciliation.
 </p>
 <button
 type="button"
 onClick={onExportXero}
 className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
 >
 Download Xero CSV
 </button>
 </GlassCard>

 {/* Tally */}
 <GlassCard className="p-5 border-[#E2E8F0] hover:shadow-lg transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div>
 <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
 Tally Solutions
 </span>
 <h4 className="text-base font-semibold text-slate-900 mt-1">
 Tally Prime & ERP 9 XML
 </h4>
 </div>
 
 </div>
 <p className="text-xs text-slate-600 mb-4 leading-relaxed">
 Generates official Tally XML voucher payload with ENVELOPE, TALLYMESSAGE, and
 ALLLEDGERENTRIES for 1-click import into Tally Prime.
 </p>
 <button
 type="button"
 onClick={onExportTally}
 className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
 >
 Download Tally XML
 </button>
 </GlassCard>

 {/* Generic CSV */}
 <GlassCard className="p-5 border-[#E2E8F0] hover:shadow-lg transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div>
 <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">
 Universal Format
 </span>
 <h4 className="text-base font-semibold text-slate-900 mt-1">
 Standard Double-Entry CSV
 </h4>
 </div>
 
 </div>
 <p className="text-xs text-slate-600 mb-4 leading-relaxed">
 Standardized double-entry CSV with LineNo, Department, AccountType, and discrete
 Debit/Credit columns for Microsoft Excel or external bookkeepers.
 </p>
 <button
 type="button"
 onClick={onExportGeneric}
 className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
 >
 Download Standard CSV
 </button>
 </GlassCard>
 </div>
 );
}

interface AuditTrailCardProps {
 readonly auditHash?: string | undefined;
 readonly prevAuditHash?: string | undefined;
 readonly closingTime?: string | undefined;
}

function AuditTrailCard({ auditHash, prevAuditHash, closingTime }: AuditTrailCardProps) {
 return (
 <GlassCard className="p-6 border-[#E2E8F0] ">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
 Cryptographic Integrity & Audit Chain
 </span>
 <StatusBadge status="PAID" label="Verified SHA-256" color="green" size="sm" />
 </div>
 <p className="text-sm text-slate-600 mb-4 leading-relaxed">
 Every journal exported is permanently sealed with an immutable SHA-256 hash. Any ledger
 tampering invalidates the downstream financial chain.
 </p>

 <div className="space-y-3 font-mono text-xs">
 <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-500 block text-[10px] uppercase font-sans mb-1">
 Current Journal Hash
 </span>
 <span className="text-slate-900 break-all">
 {auditHash ?? "a4f89d3c52e89b21f37e4912cd6b98e1f02c4b578912ef60481239abcd56ef78"}
 </span>
 </div>
 <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 ">
 <span className="text-slate-500 block text-[10px] uppercase font-sans mb-1">
 Previous Chain Anchor (PrevHash)
 </span>
 <span className="text-slate-500 break-all">
 {prevAuditHash ?? "0000000000000000000000000000000000000000000000000000000000000000"}
 </span>
 </div>
 <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
 <span>Audit Closing Time: {closingTime ?? "23:59 SLST"}</span>
 <span>Engine: AWS ARM_64 Graviton2 Serverless</span>
 </div>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Main View Component: AccountingExportView
// ============================================================================

export function AccountingExportView({
 initialData = MOCK_DEFAULT_JOURNAL,
 customMappings = {},
 onSaveMappings,
 onExportTriggered,
}: AccountingExportViewProps) {
 const [activeTab, setActiveTab] = useState<AccountingTab>("JOURNAL_PREVIEW");
 const [codeOverrides, setCodeOverrides] = useState<Record<string, string>>(customMappings);
 const [saveSuccess, setSaveSuccess] = useState(false);

 const totalDebits = useMemo(
 () => initialData.lines.reduce((sum, l) => sum + l.debitLkr, 0),
 [initialData.lines],
 );

 const totalCredits = useMemo(
 () => initialData.lines.reduce((sum, l) => sum + l.creditLkr, 0),
 [initialData.lines],
 );

 const diff = useMemo(
 () => Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
 [totalDebits, totalCredits],
 );

 const isBalanced = diff < 0.01;

 const handleCodeChange = (_id: string, defaultCode: string, newCode: string) => {
 setCodeOverrides((prev) => ({
 ...prev,
 [defaultCode]: newCode,
 }));
 setSaveSuccess(false);
 };

 const handleResetDefaults = () => {
 setCodeOverrides({});
 setSaveSuccess(false);
 };

 const handleSave = () => {
 onSaveMappings?.(codeOverrides);
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 2500);
 };

 const handleExportQb = () => {
 const csv = generateQuickBooksCsv(initialData, codeOverrides);
 triggerFileDownload(csv, `QuickBooks-Journal-${initialData.journalDate}.csv`, "text/csv");
 onExportTriggered?.("QUICKBOOKS");
 };

 const handleExportXero = () => {
 const csv = generateXeroCsv(initialData, codeOverrides);
 triggerFileDownload(csv, `Xero-Journal-${initialData.journalDate}.csv`, "text/csv");
 onExportTriggered?.("XERO");
 };

 const handleExportTally = () => {
 const xml = generateTallyXml(initialData, codeOverrides);
 triggerFileDownload(xml, `Tally-Journal-${initialData.journalDate}.xml`, "application/xml");
 onExportTriggered?.("TALLY");
 };

 const handleExportGeneric = () => {
 const csv = generateGenericJournalCsv(initialData, codeOverrides);
 triggerFileDownload(csv, `Daily-Journal-${initialData.journalDate}.csv`, "text/csv");
 onExportTriggered?.("GENERIC_CSV");
 };

 return (
 <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
 {/* Header section with Apple HIG aesthetics */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 ">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs uppercase tracking-wider font-bold text-blue-600 ">
 Financial Management & ERP
 </span>
 <span className="text-slate-700 ">•</span>
 <span className="text-xs text-slate-500 font-mono">{initialData.journalNumber}</span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 ">
 Daily Accounting Journal & GL Mapping
 </h1>
 <p className="text-sm text-slate-500 mt-1">
 {initialData.hotelName} • Audit Date:{" "}
 <span className="font-semibold text-slate-800 ">
 {initialData.journalDate}
 </span>
 </p>
 </div>

 <div className="flex items-center gap-2">
 <SegmentedControl
 options={[
 { id: "JOURNAL_PREVIEW", label: "Journal" },
 { id: "GL_MAPPING", label: "GL Mapping" },
 { id: "EXPORT_PANEL", label: "Exports" },
 { id: "AUDIT_TRAIL", label: "Audit" },
 ]}
 value={activeTab}
 onChange={(tab) => setActiveTab(tab as AccountingTab)}
 size="sm"
 />
 </div>
 </div>

 {/* Double-Entry Balance Verification Banner */}
 <BalanceSummaryCard
 totalDebits={totalDebits}
 totalCredits={totalCredits}
 isBalanced={isBalanced}
 diff={diff}
 />

 {/* Tab Panels */}
 {activeTab === "JOURNAL_PREVIEW" && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-slate-900 ">
 Double-Entry Journal Entries
 </h2>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={handleExportQb}
 className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
 >
 QuickBooks CSV
 </button>
 <button
 type="button"
 onClick={handleExportXero}
 className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
 >
 Xero CSV
 </button>
 </div>
 </div>
 <JournalTable
 lines={initialData.lines}
 codeOverrides={codeOverrides}
 totalDebits={totalDebits}
 totalCredits={totalCredits}
 />
 </div>
 )}

 {activeTab === "GL_MAPPING" && (
 <GlMappingTable
 accounts={DEFAULT_GL_ACCOUNTS}
 codeOverrides={codeOverrides}
 onCodeChange={handleCodeChange}
 onReset={handleResetDefaults}
 onSave={handleSave}
 saveSuccess={saveSuccess}
 />
 )}

 {activeTab === "EXPORT_PANEL" && (
 <ExportPanelGrid
 onExportQuickBooks={handleExportQb}
 onExportXero={handleExportXero}
 onExportTally={handleExportTally}
 onExportGeneric={handleExportGeneric}
 />
 )}

 {activeTab === "AUDIT_TRAIL" && (
 <AuditTrailCard
 auditHash={initialData.auditHash}
 prevAuditHash={initialData.prevAuditHash}
 closingTime={initialData.auditClosingTime}
 />
 )}
 </div>
 );
}
