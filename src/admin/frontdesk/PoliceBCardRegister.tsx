import type React from "react";
import { useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type BCardGuestStatus = "IN_HOUSE" | "CHECKED_OUT" | "RESERVED";
export type BCardGender = "MALE" | "FEMALE" | "OTHER";

export interface PoliceBCardEntry {
  readonly id: string;
  readonly bCardSerialNo: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly passportNumber: string;
  readonly nationality: string;
  readonly countryCode: string;
  readonly gender: BCardGender;
  readonly dateOfBirth: string; // YYYY-MM-DD
  readonly arrivalDate: string; // YYYY-MM-DD
  readonly arrivalTime?: string | undefined;
  readonly departureDate: string; // YYYY-MM-DD
  readonly departureTime?: string | undefined;
  readonly arrivedFrom: string;
  readonly nextDestination: string;
  readonly visaNumber?: string | undefined;
  readonly verifiedByStaffName: string;
  readonly status: BCardGuestStatus;
  readonly remarks?: string | undefined;
}

interface PoliceBCardSummary {
  readonly totalForeignGuests: number;
  readonly inHouseCount: number;
  readonly arrivingTodayCount: number;
  readonly departingTodayCount: number;
  readonly topNationalities: readonly {
    readonly country: string;
    readonly count: number;
  }[];
}

export interface PoliceBCardRegisterProps {
  readonly entries?: readonly PoliceBCardEntry[] | undefined;
  readonly hotelName?: string | undefined;
  readonly sltdaLicenseNo?: string | undefined;
  readonly policeDivision?: string | undefined;
  readonly currentDate?: string | undefined;
  readonly onUpdateEntry?: ((entry: PoliceBCardEntry) => void) | undefined;
  readonly onExportCsv?: ((csvContent: string) => void) | undefined;
  readonly onPrintRegister?: (() => void) | undefined;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function computeBCardSummary(
  entries: readonly PoliceBCardEntry[],
  targetDate: string,
): PoliceBCardSummary {
  let inHouseCount = 0;
  let arrivingTodayCount = 0;
  let departingTodayCount = 0;
  const nationalityCounts: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.status === "IN_HOUSE") {
      inHouseCount += 1;
    }
    if (entry.arrivalDate === targetDate) {
      arrivingTodayCount += 1;
    }
    if (entry.departureDate === targetDate) {
      departingTodayCount += 1;
    }

    const currentCount = nationalityCounts[entry.nationality] ?? 0;
    nationalityCounts[entry.nationality] = currentCount + 1;
  }

  const topNationalities = Object.entries(nationalityCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    totalForeignGuests: entries.length,
    inHouseCount,
    arrivingTodayCount,
    departingTodayCount,
    topNationalities,
  };
}

function matchesSearchQuery(entry: PoliceBCardEntry, q: string): boolean {
  if (q.length === 0) {
    return true;
  }
  const target =
    `${entry.guestName} ${entry.passportNumber} ${entry.roomNumber} ${entry.nationality} ${entry.arrivedFrom} ${entry.nextDestination}`.toLowerCase();
  return target.includes(q);
}

function matchesStatus(entry: PoliceBCardEntry, statusFilter: string): boolean {
  if (statusFilter === "ALL") {
    return true;
  }
  return entry.status === statusFilter;
}

export function filterBCardEntries(
  entries: readonly PoliceBCardEntry[],
  filters: {
    readonly query: string;
    readonly statusFilter: string;
    readonly dateFilter?: string | undefined;
  },
): readonly PoliceBCardEntry[] {
  const q = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!matchesSearchQuery(entry, q)) {
      return false;
    }
    if (!matchesStatus(entry, filters.statusFilter)) {
      return false;
    }
    if (filters.dateFilter && filters.dateFilter.length > 0) {
      const active =
        filters.dateFilter >= entry.arrivalDate && filters.dateFilter <= entry.departureDate;
      if (!active) {
        return false;
      }
    }
    return true;
  });
}

function escapeCsvField(val: string | undefined): string {
  if (!val) {
    return "";
  }
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function generatePoliceBCardCsv(
  entries: readonly PoliceBCardEntry[],
  hotelName: string,
  sltdaNo: string,
  exportDate: string,
): string {
  const headerLines = [
    "# SRI LANKA TOURIST POLICE - OFFICIAL B-CARD FOREIGN GUEST REGISTER",
    `# Property: ${hotelName}`,
    `# SLTDA License: ${sltdaNo}`,
    `# Export Date: ${exportDate}`,
    "Serial No,Room,Guest Name,Passport No,Nationality,Country Code,Gender,DOB,Arrival Date,Arrival Time,Departure Date,Departure Time,Arrived From,Next Destination,Visa/ETA No,Verified By,Status,Remarks",
  ];

  const dataRows = entries.map((entry) => {
    return [
      escapeCsvField(entry.bCardSerialNo),
      escapeCsvField(entry.roomNumber),
      escapeCsvField(entry.guestName),
      escapeCsvField(entry.passportNumber),
      escapeCsvField(entry.nationality),
      escapeCsvField(entry.countryCode),
      escapeCsvField(entry.gender),
      escapeCsvField(entry.dateOfBirth),
      escapeCsvField(entry.arrivalDate),
      escapeCsvField(entry.arrivalTime ?? ""),
      escapeCsvField(entry.departureDate),
      escapeCsvField(entry.departureTime ?? ""),
      escapeCsvField(entry.arrivedFrom),
      escapeCsvField(entry.nextDestination),
      escapeCsvField(entry.visaNumber ?? ""),
      escapeCsvField(entry.verifiedByStaffName),
      escapeCsvField(entry.status),
      escapeCsvField(entry.remarks ?? ""),
    ].join(",");
  });

  return `${headerLines.join("\n")}\n${dataRows.join("\n")}\n`;
}

export function validateBCardStatutoryFields(entry: Partial<PoliceBCardEntry>): {
  readonly isValid: boolean;
  readonly error?: string | undefined;
} {
  if (!entry.passportNumber || entry.passportNumber.trim().length < 5) {
    return {
      isValid: false,
      error: "Passport Number must be at least 5 alphanumeric characters.",
    };
  }
  if (!entry.nationality || entry.nationality.trim().length < 2) {
    return {
      isValid: false,
      error: "Nationality / Issuing Country is required by Tourist Police.",
    };
  }
  if (!entry.arrivedFrom || entry.arrivedFrom.trim().length < 2) {
    return {
      isValid: false,
      error: "Port or place arrived from (e.g. BIA Airport / Colombo) is required.",
    };
  }
  if (!entry.nextDestination || entry.nextDestination.trim().length < 2) {
    return {
      isValid: false,
      error: "Next destination (e.g. Nuwara Eliya / Ella / BIA Airport) is required.",
    };
  }
  return { isValid: true };
}

// ============================================================================
// Default Sample Presets
// ============================================================================

export const DEFAULT_POLICE_BCARD_ENTRIES: readonly PoliceBCardEntry[] = [
  {
    id: "bc-entry-001",
    bCardSerialNo: "BC-2026-0042",
    roomNumber: "101",
    guestName: "Alexander James Wright",
    passportNumber: "GB98451234",
    nationality: "British",
    countryCode: "GB",
    gender: "MALE",
    dateOfBirth: "1988-04-12",
    arrivalDate: "2026-10-18",
    arrivalTime: "14:30",
    departureDate: "2026-10-22",
    departureTime: "11:00",
    arrivedFrom: "BIA Airport (CMB)",
    nextDestination: "Nuwara Eliya (Tea Trails)",
    visaNumber: "ETA-2026-78819",
    verifiedByStaffName: "K. Bandara",
    status: "IN_HOUSE",
    remarks: "Round-trip chauffeur hired",
  },
  {
    id: "bc-entry-002",
    bCardSerialNo: "BC-2026-0043",
    roomNumber: "204",
    guestName: "Emma Charlotte Wright",
    passportNumber: "GB98451235",
    nationality: "British",
    countryCode: "GB",
    gender: "FEMALE",
    dateOfBirth: "1990-09-24",
    arrivalDate: "2026-10-18",
    arrivalTime: "14:30",
    departureDate: "2026-10-22",
    departureTime: "11:00",
    arrivedFrom: "BIA Airport (CMB)",
    nextDestination: "Nuwara Eliya (Tea Trails)",
    visaNumber: "ETA-2026-78820",
    verifiedByStaffName: "K. Bandara",
    status: "IN_HOUSE",
  },
  {
    id: "bc-entry-003",
    bCardSerialNo: "BC-2026-0044",
    roomNumber: "302",
    guestName: "Maximilian Schneider",
    passportNumber: "C14NP2901",
    nationality: "German",
    countryCode: "DE",
    gender: "MALE",
    dateOfBirth: "1982-11-05",
    arrivalDate: "2026-10-19",
    arrivalTime: "15:15",
    departureDate: "2026-10-23",
    departureTime: "10:30",
    arrivedFrom: "Galle Face Hotel, Colombo",
    nextDestination: "Ella (Nine Arch Bridge)",
    visaNumber: "ETA-2026-90412",
    verifiedByStaffName: "M. Perera",
    status: "IN_HOUSE",
  },
  {
    id: "bc-entry-004",
    bCardSerialNo: "BC-2026-0045",
    roomNumber: "405",
    guestName: "Claire Helene Dubois",
    passportNumber: "19FB88210",
    nationality: "French",
    countryCode: "FR",
    gender: "FEMALE",
    dateOfBirth: "1995-02-18",
    arrivalDate: "2026-10-19",
    arrivalTime: "16:00",
    departureDate: "2026-10-25",
    departureTime: "12:00",
    arrivedFrom: "Sigiriya Water Garden",
    nextDestination: "BIA Airport (CMB Departure)",
    visaNumber: "ETA-2026-11845",
    verifiedByStaffName: "M. Perera",
    status: "IN_HOUSE",
    remarks: "Airport transfer booked",
  },
  {
    id: "bc-entry-005",
    bCardSerialNo: "BC-2026-0046",
    roomNumber: "108",
    guestName: "Rohan Sandeep Sharma",
    passportNumber: "Z6109923",
    nationality: "Indian",
    countryCode: "IN",
    gender: "MALE",
    dateOfBirth: "1979-06-30",
    arrivalDate: "2026-10-17",
    arrivalTime: "18:00",
    departureDate: "2026-10-19",
    departureTime: "11:30",
    arrivedFrom: "Taj Samudra Colombo",
    nextDestination: "Kandy (Temple of the Tooth)",
    visaNumber: "ETA-2026-33901",
    verifiedByStaffName: "K. Bandara",
    status: "CHECKED_OUT",
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface SummaryStripProps {
  readonly summary: PoliceBCardSummary;
}

function BCardSummaryStrip({ summary }: SummaryStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">In-House Foreign Nationals</span>
        <span className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
          {summary.inHouseCount}
        </span>
        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
          Active B-Card Registry
        </span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Arrivals Logged Today</span>
        <span className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
          {summary.arrivingTodayCount}
        </span>
        <span className="block text-[10px] text-slate-400 mt-0.5">New Passport Filings</span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Departures Today</span>
        <span className="font-mono text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">
          {summary.departingTodayCount}
        </span>
        <span className="block text-[10px] text-slate-400 mt-0.5">Cleared to Next Destination</span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Top Origin Nationalities</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {summary.topNationalities.map((item) => (
            <span
              key={item.country}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {item.country}: {item.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  readonly entry: PoliceBCardEntry;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (updated: PoliceBCardEntry) => void;
  readonly disabled?: boolean | undefined;
}

function EditBCardDialog({ entry, isOpen, onClose, onSave, disabled }: EditModalProps) {
  const [arrivedFrom, setArrivedFrom] = useState(entry.arrivedFrom);
  const [nextDestination, setNextDestination] = useState(entry.nextDestination);
  const [visaNumber, setVisaNumber] = useState(entry.visaNumber ?? "");
  const [remarks, setRemarks] = useState(entry.remarks ?? "");
  const [error, setError] = useState<string | null>(null);

  const arrId = useId();
  const nextId = useId();
  const visaId = useId();
  const remId = useId();

  if (!isOpen) {
    return null;
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const candidate: PoliceBCardEntry = {
      ...entry,
      arrivedFrom: arrivedFrom.trim(),
      nextDestination: nextDestination.trim(),
      visaNumber: visaNumber.trim().length > 0 ? visaNumber.trim() : undefined,
      remarks: remarks.trim().length > 0 ? remarks.trim() : undefined,
    };

    const validation = validateBCardStatutoryFields(candidate);
    if (!validation.isValid) {
      setError(validation.error ?? "Validation error");
      return;
    }

    setError(null);
    onSave(candidate);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Edit Tourist Police B-Card Statutory Fields"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto w-full h-full border-none m-0 max-w-none max-h-none"
    >
      <div className="relative w-full max-w-lg rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {entry.bCardSerialNo} • Room {entry.roomNumber}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {entry.guestName}
            </h3>
            <span className="text-slate-400">
              Passport: {entry.passportNumber} ({entry.nationality})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl min-h-[44px] min-w-[44px]"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div>
            <label
              htmlFor={arrId}
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Port / Place Arrived From *
            </label>
            <input
              id={arrId}
              type="text"
              value={arrivedFrom}
              disabled={disabled}
              onChange={(e) => setArrivedFrom(e.target.value)}
              placeholder="e.g. BIA Airport (CMB) or Galle Face Hotel"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={nextId}
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Next Destination *
            </label>
            <input
              id={nextId}
              type="text"
              value={nextDestination}
              disabled={disabled}
              onChange={(e) => setNextDestination(e.target.value)}
              placeholder="e.g. Nuwara Eliya / Ella / BIA Departure"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={visaId}
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Sri Lanka Visa / ETA Reference No. (Optional)
            </label>
            <input
              id={visaId}
              type="text"
              value={visaNumber}
              disabled={disabled}
              onChange={(e) => setVisaNumber(e.target.value)}
              placeholder="e.g. ETA-2026-99120"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={remId}
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Remarks / Police Log Notes (Optional)
            </label>
            <input
              id={remId}
              type="text"
              value={remarks}
              disabled={disabled}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Chauffeur guide accompanied"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
            >
              ⚠️ {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[44px]"
            >
              Save B-Card Record
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

interface PoliceBCardTableRowProps {
  readonly entry: PoliceBCardEntry;
  readonly disabled?: boolean | undefined;
  readonly onEdit: (entry: PoliceBCardEntry) => void;
}

function PoliceBCardTableRow({ entry, disabled, onEdit }: PoliceBCardTableRowProps) {
  const missingTravelDetails =
    entry.arrivedFrom.trim().length === 0 || entry.nextDestination.trim().length === 0;

  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
      <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
        {entry.bCardSerialNo}
      </td>
      <td className="px-3 py-2 font-mono font-bold">{entry.roomNumber}</td>
      <td className="px-3 py-2">
        <span className="font-semibold text-slate-900 dark:text-white block">
          {entry.guestName}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {entry.passportNumber} • {entry.gender[0]}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="font-medium text-slate-800 dark:text-slate-200 block">
          {entry.nationality}
        </span>
        <span className="font-mono text-[10px] text-slate-400">({entry.countryCode})</span>
      </td>
      <td className="px-3 py-2">
        <span className="font-mono text-[11px] block">
          {entry.arrivalDate} {entry.arrivalTime ?? ""}
        </span>
        <span className="text-[11px] text-slate-500 block">From: {entry.arrivedFrom}</span>
      </td>
      <td className="px-3 py-2">
        <span className="font-mono text-[11px] block">
          {entry.departureDate} {entry.departureTime ?? ""}
        </span>
        <span className="text-[11px] text-slate-500 block">To: {entry.nextDestination}</span>
      </td>
      <td className="px-3 py-2 font-mono text-[11px]">
        {entry.visaNumber ? (
          <span className="text-slate-800 dark:text-slate-200">{entry.visaNumber}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">
        {entry.verifiedByStaffName}
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
            entry.status === "IN_HOUSE"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {entry.status === "IN_HOUSE" ? "In-House" : "Checked-Out"}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          disabled={disabled}
          className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
            missingTravelDetails
              ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100"
          }`}
        >
          {missingTravelDetails ? "⚠️ Complete" : "Edit"}
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PoliceBCardRegister({
  entries = DEFAULT_POLICE_BCARD_ENTRIES,
  hotelName = "Earl's Regency Kandy",
  sltdaLicenseNo = "SLTDA/HOTEL/2026/0148",
  policeDivision = "Kandy Tourist Police Division",
  currentDate = "2026-10-19",
  onUpdateEntry,
  onExportCsv,
  onPrintRegister,
  disabled = false,
}: PoliceBCardRegisterProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingEntry, setEditingEntry] = useState<PoliceBCardEntry | null>(null);
  const [allEntries, setAllEntries] = useState<readonly PoliceBCardEntry[]>(entries);

  const summary = useMemo(() => {
    return computeBCardSummary(allEntries, currentDate);
  }, [allEntries, currentDate]);

  const filteredEntries = useMemo(() => {
    return filterBCardEntries(allEntries, { query, statusFilter });
  }, [allEntries, query, statusFilter]);

  const statusOptions: readonly SegmentedControlOption<string>[] = [
    { id: "ALL", label: `All Foreign (${allEntries.length})` },
    { id: "IN_HOUSE", label: `In-House (${summary.inHouseCount})` },
    { id: "CHECKED_OUT", label: "Checked-Out" },
  ];

  const handleExportCsv = () => {
    const csv = generatePoliceBCardCsv(filteredEntries, hotelName, sltdaLicenseNo, currentDate);

    if (onExportCsv) {
      onExportCsv(csv);
      return;
    }

    if (typeof window !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Police_BCard_Register_${hotelName.replace(/\s+/g, "_")}_${currentDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    if (onPrintRegister) {
      onPrintRegister();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleSaveEntry = (updated: PoliceBCardEntry) => {
    const next = allEntries.map((e) => (e.id === updated.id ? updated : e));
    setAllEntries(next);
    setEditingEntry(null);
    onUpdateEntry?.(updated);
  };

  return (
    <div className="w-full rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      {/* Official Police Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              👮‍♂️
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Sri Lanka Tourist Police Foreign Arrival Register (B-Card)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {hotelName} • SLTDA License: {sltdaLicenseNo} • {policeDivision}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] transition-colors"
          >
            <span>📥</span>
            <span>Export Police CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition-all shadow-sm"
          >
            <span>🖨️</span>
            <span>Print Official Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <BCardSummaryStrip summary={summary} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            disabled={disabled}
            size="sm"
            ariaLabel="B-Card Status Filter"
          />
        </div>

        <div className="flex-1 max-w-sm">
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search passport, name, nationality, or destination..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
          />
        </div>
      </div>

      {/* Official Statutory Ledger Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-3 py-2.5">B-Card Serial</th>
              <th className="px-3 py-2.5">Room</th>
              <th className="px-3 py-2.5">Full Name &amp; Passport No</th>
              <th className="px-3 py-2.5">Nationality</th>
              <th className="px-3 py-2.5">Arrival (From)</th>
              <th className="px-3 py-2.5">Departure (Next Destination)</th>
              <th className="px-3 py-2.5">Visa / ETA</th>
              <th className="px-3 py-2.5">Verified By</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  No foreign arrival records matching the selected criteria.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <PoliceBCardTableRow
                  key={entry.id}
                  entry={entry}
                  disabled={disabled}
                  onEdit={setEditingEntry}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Statutory Footer for Inspections */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>
            Statutory requirement under Sri Lanka Immigrants &amp; Emigrants Act and Tourist Police
            Directive.
          </span>
          <span className="font-mono">Inspection Register Checked: {currentDate}</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <EditBCardDialog
          entry={editingEntry}
          isOpen={true}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEntry}
          disabled={disabled}
        />
      )}
    </div>
  );
}
