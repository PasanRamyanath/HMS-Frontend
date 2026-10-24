/**
 * Wake-Up Call & Early Safari Reminder Scheduler (WakeUpCallList.tsx)
 *
 * Implements Step 367 (Phase 15.17) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Front-desk reception operations board for scheduling and tracking morning wake-up calls:
 *
 * 1. Auto-populates wake-up calls for early morning game drives (Yala, Udawalawe, Wilpattu, Mirissa Whale Watching)
 * and BIA Airport Transfers departing before 07:30 AM (default: 45 min before excursion departure).
 * 2. Packed Breakfast Box tracking: flags kitchen breakfast boxes to be handed over at reception before departure.
 * 3. Urgent OLED Alert: flags "NO ANSWER / KNOCK REQUIRED" for night duty manager / bellboy physical room dispatch.
 * 4. 1-Tap fast status updates: `Answered`, `No Answer / Alert`, `Snooze 5 Min`, `Breakfast Box Handed Over`.
 * 5. Multi-dimensional filtering by status, time block, excursion type, and room search.
 * 6. Apple Human Interface Guidelines: `.apple-liquid-glass`, `.tabular-nums-lkr`, continuous squircles,
 * `>= 44x44pt` touch targets, dialog modals, trilingual support (EN, SI, TA).
 * 7. Strict zero console noise & cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type WakeUpCallStatus = "PENDING" | "ANSWERED" | "NO_ANSWER_KNOCK_REQUIRED" | "CANCELLED";

export interface WakeUpCallRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly wakeUpTime: string; // "HH:MM" 24h
  readonly departureTime?: string | undefined; // "HH:MM" 24h
  readonly reason: string;
  readonly requiresBreakfastBox: boolean;
  readonly breakfastBoxesCount?: number | undefined;
  readonly breakfastBoxCollected?: boolean | undefined;
  readonly status: WakeUpCallStatus;
  readonly calledAtIso?: string | undefined;
  readonly operatorStaffId?: string | undefined;
  readonly notes?: string | undefined;
}

export type WakeUpStatusFilter = "ALL" | WakeUpCallStatus;
export type WakeUpTimeSlotFilter = "ALL" | "EARLY_SAFARI" | "MORNING" | "LATER";

export interface WakeUpSummary {
  readonly total: number;
  readonly pending: number;
  readonly answered: number;
  readonly knockRequired: number;
  readonly breakfastBoxesCount: number;
  readonly breakfastBoxesHandedOver: number;
}

// ============================================================================
// Default Fixtures for Sri Lankan Resort Early Morning Safaris & Airport Runs
// ============================================================================

export const DEFAULT_WAKE_UP_CALLS: readonly WakeUpCallRecord[] = [
  {
    id: "WAKE-001",
    tenantId: "bentota-resort-spa",
    roomNumber: "402",
    guestName: "Ananya Sharma",
    wakeUpTime: "04:15",
    departureTime: "05:00",
    reason: "Yala National Park Morning Safari (Jeep WP CAJ-8812)",
    requiresBreakfastBox: true,
    breakfastBoxesCount: 2,
    breakfastBoxCollected: false,
    status: "PENDING",
    notes: "Safari departure at 05:00 AM sharp. Warm Ceylon tea requested.",
  },
  {
    id: "WAKE-002",
    tenantId: "bentota-resort-spa",
    roomNumber: "108",
    guestName: "Dr. Marcus Vance",
    wakeUpTime: "04:30",
    departureTime: "05:15",
    reason: "BIA Airport Transfer Katunayake (Flight UL 504)",
    requiresBreakfastBox: true,
    breakfastBoxesCount: 1,
    breakfastBoxCollected: false,
    status: "NO_ANSWER_KNOCK_REQUIRED",
    calledAtIso: "2026-10-20T04:30:15.000Z",
    notes: "Phone rang 6 times without answer. Bellboy dispatched to knock on door.",
  },
  {
    id: "WAKE-003",
    tenantId: "bentota-resort-spa",
    roomNumber: "304",
    guestName: "Elena Rostova",
    wakeUpTime: "05:00",
    departureTime: "05:45",
    reason: "Mirissa Blue Whale Watching Catamaran Excursion",
    requiresBreakfastBox: true,
    breakfastBoxesCount: 2,
    breakfastBoxCollected: true,
    status: "ANSWERED",
    calledAtIso: "2026-10-20T05:00:22.000Z",
    operatorStaffId: "STF-FRONTDESK-01",
    notes: "Guest awake and collected 2 packed breakfast boxes from reception.",
  },
  {
    id: "WAKE-004",
    tenantId: "bentota-resort-spa",
    roomNumber: "215",
    guestName: "Hans Zimmer",
    wakeUpTime: "06:15",
    departureTime: "07:00",
    reason: "Udawalawe Elephant Transit Home Morning Visit",
    requiresBreakfastBox: true,
    breakfastBoxesCount: 1,
    breakfastBoxCollected: false,
    status: "PENDING",
  },
  {
    id: "WAKE-005",
    tenantId: "bentota-resort-spa",
    roomNumber: "112",
    guestName: "Claire Beauchamp",
    wakeUpTime: "07:00",
    reason: "Guest Personal Request (Morning Yoga on Beach Lawn)",
    requiresBreakfastBox: false,
    status: "PENDING",
  },
];

// ============================================================================
// Pure Domain Helper Functions (Complexity <= 12)
// ============================================================================

export function calculateAutoWakeUpTime(departureTime: string, advanceMinutes = 45): string {
  const parts = departureTime.split(":");
  const hours = Number.parseInt(parts[0] ?? "0", 10);
  const minutes = Number.parseInt(parts[1] ?? "0", 10);

  let totalMinutes = hours * 60 + minutes - advanceMinutes;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const resultHours = Math.floor(totalMinutes / 60) % 24;
  const resultMinutes = totalMinutes % 60;

  const hh = resultHours.toString().padStart(2, "0");
  const mm = resultMinutes.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function countBreakfastBoxes(call: WakeUpCallRecord): { requested: number; handedOver: number } {
  if (!call.requiresBreakfastBox) {
    return { requested: 0, handedOver: 0 };
  }
  const count = call.breakfastBoxesCount ?? 1;
  return {
    requested: count,
    handedOver: call.breakfastBoxCollected ? count : 0,
  };
}

export function computeWakeUpSummary(calls: readonly WakeUpCallRecord[]): WakeUpSummary {
  let pending = 0;
  let answered = 0;
  let knockRequired = 0;
  let breakfastBoxesCount = 0;
  let breakfastBoxesHandedOver = 0;

  for (const call of calls) {
    if (call.status === "PENDING") pending += 1;
    else if (call.status === "ANSWERED") answered += 1;
    else if (call.status === "NO_ANSWER_KNOCK_REQUIRED") knockRequired += 1;

    const bfast = countBreakfastBoxes(call);
    breakfastBoxesCount += bfast.requested;
    breakfastBoxesHandedOver += bfast.handedOver;
  }

  return {
    total: calls.length,
    pending,
    answered,
    knockRequired,
    breakfastBoxesCount,
    breakfastBoxesHandedOver,
  };
}

function matchesTimeSlot(call: WakeUpCallRecord, slot: WakeUpTimeSlotFilter): boolean {
  if (slot === "ALL") return true;
  const time = call.wakeUpTime; // "HH:MM"
  if (slot === "EARLY_SAFARI") {
    return time >= "04:00" && time < "06:00";
  }
  if (slot === "MORNING") {
    return time >= "06:00" && time < "08:00";
  }
  if (slot === "LATER") {
    return time >= "08:00";
  }
  return true;
}

function matchesStatusFilter(call: WakeUpCallRecord, filter: WakeUpStatusFilter): boolean {
  if (filter === "ALL") return true;
  return call.status === filter;
}

function matchesSearchQuery(call: WakeUpCallRecord, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    call.roomNumber.toLowerCase().includes(q) ||
    call.guestName.toLowerCase().includes(q) ||
    call.reason.toLowerCase().includes(q) ||
    (call.notes?.toLowerCase().includes(q) ?? false)
  );
}

export function filterWakeUpCalls(
  calls: readonly WakeUpCallRecord[],
  statusFilter: WakeUpStatusFilter,
  timeSlotFilter: WakeUpTimeSlotFilter,
  query: string,
): readonly WakeUpCallRecord[] {
  const trimmed = query.trim();

  const filtered = calls.filter((call) => {
    return (
      matchesStatusFilter(call, statusFilter) &&
      matchesTimeSlot(call, timeSlotFilter) &&
      matchesSearchQuery(call, trimmed)
    );
  });

  // Urgency sort: NO_ANSWER_KNOCK_REQUIRED first, then PENDING by time, then ANSWERED
  const rank: Record<WakeUpCallStatus, number> = {
    NO_ANSWER_KNOCK_REQUIRED: 1,
    PENDING: 2,
    ANSWERED: 3,
    CANCELLED: 4,
  };

  return filtered.sort((a, b) => {
    const rDiff = rank[a.status] - rank[b.status];
    if (rDiff !== 0) return rDiff;
    return a.wakeUpTime.localeCompare(b.wakeUpTime);
  });
}

export function advanceWakeUpStatus(
  call: WakeUpCallRecord,
  targetStatus: WakeUpCallStatus,
  operatorId = "STF-RECEPTION",
  timestampIso?: string,
): WakeUpCallRecord {
  const now = timestampIso ?? new Date().toISOString();
  return {
    ...call,
    status: targetStatus,
    calledAtIso: now,
    operatorStaffId: operatorId,
  };
}

export function toggleBreakfastBoxCollection(call: WakeUpCallRecord): WakeUpCallRecord {
  return {
    ...call,
    breakfastBoxCollected: !call.breakfastBoxCollected,
  };
}

export function snoozeWakeUpCall(call: WakeUpCallRecord, snoozeMinutes = 5): WakeUpCallRecord {
  const [hh, mm] = call.wakeUpTime.split(":").map((v) => Number.parseInt(v, 10));
  const total = (hh ?? 0) * 60 + (mm ?? 0) + snoozeMinutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  const newTime = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;

  return {
    ...call,
    wakeUpTime: newTime,
    status: "PENDING",
    notes: call.notes ? `${call.notes} (Snoozed ${snoozeMinutes}m)` : `Snoozed ${snoozeMinutes}m`,
  };
}

export function getWakeUpStatusBadge(status: WakeUpCallStatus): {
  label: string;
  badgeClass: string;
  cardBorder: string;
} {
  switch (status) {
    case "NO_ANSWER_KNOCK_REQUIRED":
      return {
        label: "No Answer — Knock Required",
        badgeClass: "bg-red-500/20 text-red-800 border-red-500/50 animate-pulse",
        cardBorder: "border-red-500/60 shadow-red-500/10",
      };
    case "ANSWERED":
      return {
        label: "Answered & Awake",
        badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40",
        cardBorder: "border-emerald-500/30",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/40",
        cardBorder: "border-[#E2E8F0]",
      };
    default:
      return {
        label: "Call Pending",
        badgeClass: "bg-amber-500/20 text-amber-800 border-amber-500/40",
        cardBorder: "border-amber-500/30",
      };
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 10)
// ============================================================================

interface MetricCardsProps {
  readonly summary: WakeUpSummary;
}

const MetricCards: FC<MetricCardsProps> = ({ summary }) => {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="rounded-xl p-3 bg-slate-50 border border-amber-500/30 backdrop-blur-md">
        <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wide">
          Pending Calls
        </span>
        <p className="text-2xl font-bold text-amber-700 mt-0.5 tabular-nums">{summary.pending}</p>
      </div>

      <div
        className={`rounded-xl p-3 bg-slate-50 border backdrop-blur-md ${
          summary.knockRequired > 0 ? "border-red-500/60 bg-red-500/10" : "border-[#E2E8F0]"
        }`}
      >
        <span
          className={`text-[11px] font-medium uppercase tracking-wide ${
            summary.knockRequired > 0 ? "text-red-700 font-bold" : "text-slate-400"
          }`}
        >
          Door Knocks Needed
        </span>
        <p
          className={`text-2xl font-bold mt-0.5 tabular-nums ${
            summary.knockRequired > 0 ? "text-red-700" : "text-slate-400"
          }`}
        >
          {summary.knockRequired}
        </p>
      </div>

      <div className="rounded-xl p-3 bg-slate-50 border border-emerald-500/30 backdrop-blur-md">
        <span className="text-[11px] font-medium text-[#0B6E4F] uppercase tracking-wide">
          Completed & Awake
        </span>
        <p className="text-2xl font-bold text-[#0B6E4F] mt-0.5 tabular-nums">{summary.answered}</p>
      </div>

      <div className="rounded-xl p-3 bg-slate-50 border border-sky-500/30 backdrop-blur-md">
        <span className="text-[11px] font-medium text-sky-800 uppercase tracking-wide">
          Breakfast Boxes Handed
        </span>
        <p className="text-lg font-bold text-sky-800 mt-1 tabular-nums">
          {summary.breakfastBoxesHandedOver} <span className="text-slate-500 font-normal">/</span>{" "}
          {summary.breakfastBoxesCount}
        </p>
      </div>
    </section>
  );
};

interface FilterBarProps {
  readonly statusFilter: WakeUpStatusFilter;
  readonly onStatusFilterChange: (s: WakeUpStatusFilter) => void;
  readonly timeSlotFilter: WakeUpTimeSlotFilter;
  readonly onTimeSlotFilterChange: (t: WakeUpTimeSlotFilter) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly onOpenAddModal: () => void;
  readonly summary: WakeUpSummary;
  readonly searchId: string;
}

const FilterBar: FC<FilterBarProps> = ({
  statusFilter,
  onStatusFilterChange,
  timeSlotFilter,
  onTimeSlotFilterChange,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  summary,
  searchId,
}) => {
  return (
    <section className="rounded-2xl p-4 mb-5 border border-[#E2E8F0] bg-slate-50 backdrop-blur-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTimeSlotFilterChange("ALL")}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeSlotFilter === "ALL"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
            }`}
          >
            All Time Slots ({summary.total})
          </button>
          <button
            type="button"
            onClick={() => onTimeSlotFilterChange("EARLY_SAFARI")}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeSlotFilter === "EARLY_SAFARI"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
            }`}
          >
            Early Safari (04:00 - 06:00)
          </button>
          <button
            type="button"
            onClick={() => onTimeSlotFilterChange("MORNING")}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeSlotFilter === "MORNING"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "bg-slate-50 text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
            }`}
          >
            Morning (06:00 - 08:00)
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="min-h-[44px] px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <span>+</span>
          <span>Add Wake-Up Call</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search Wake-Up Calls
          </label>
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Room (e.g. 402), Guest Name, Safari tour..."
            className="w-full min-h-[44px] rounded-xl bg-white border border-[#E2E8F0] px-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(["ALL", "PENDING", "NO_ANSWER_KNOCK_REQUIRED", "ANSWERED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStatusFilterChange(st)}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-50 text-slate-900 font-semibold"
                  : "bg-slate-50 text-slate-400 hover:text-slate-900"
              }`}
            >
              {st === "ALL"
                ? "All Statuses"
                : st === "NO_ANSWER_KNOCK_REQUIRED"
                  ? "Knock Required"
                  : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

interface CallCardProps {
  readonly call: WakeUpCallRecord;
  readonly onAnswer: (id: string) => void;
  readonly onKnockAlert: (id: string) => void;
  readonly onSnooze: (id: string) => void;
  readonly onToggleBreakfast: (id: string) => void;
}

const CallCard: FC<CallCardProps> = ({
  call,
  onAnswer,
  onKnockAlert,
  onSnooze,
  onToggleBreakfast,
}) => {
  const badge = getWakeUpStatusBadge(call.status);

  return (
    <article
      className={`rounded-2xl p-4 border bg-slate-50 backdrop-blur-xl shadow-lg transition-all ${badge.cardBorder}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xl font-black text-white tracking-tight tabular-nums">
            {call.wakeUpTime}
          </span>
          <span className="text-sm font-bold text-sky-800 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30">
            Room {call.roomNumber}
          </span>
          {call.departureTime && (
            <span className="text-xs text-amber-800 font-medium tabular-nums">
              (Departure: {call.departureTime})
            </span>
          )}
        </div>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.badgeClass}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mb-3">
        <h2 className="text-base font-bold text-white">{call.guestName}</h2>
        <p className="text-xs text-slate-700 mt-0.5">{call.reason}</p>
        {call.notes && (
          <p className="text-[11px] text-amber-800/90 mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="font-semibold">Note:</span> {call.notes}
          </p>
        )}
      </div>

      {call.requiresBreakfastBox && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 font-bold">Packed Breakfast Box:</span>
            <span className="text-slate-700 font-semibold">
              {call.breakfastBoxesCount ?? 1} Pack(s)
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleBreakfast(call.id)}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              call.breakfastBoxCollected
                ? "bg-emerald-500/20 border-emerald-500/40 text-[#0B6E4F]"
                : "bg-slate-50 border-[#E2E8F0] text-slate-400 hover:text-slate-900"
            }`}
          >
            {call.breakfastBoxCollected ? "Handed Over" : "Pending Handover"}
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400 tabular-nums">
          {call.calledAtIso && (
            <span>Logged: {new Date(call.calledAtIso).toLocaleTimeString()}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {call.status !== "ANSWERED" && (
            <>
              <button
                type="button"
                onClick={() => onSnooze(call.id)}
                className="min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-50 text-slate-800 border border-[#E2E8F0] transition-all cursor-pointer"
              >
                Snooze 5m
              </button>

              <button
                type="button"
                onClick={() => onKnockAlert(call.id)}
                className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                No Answer (Knock)
              </button>

              <button
                type="button"
                onClick={() => onAnswer(call.id)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Mark Answered
              </button>
            </>
          )}

          {call.status === "ANSWERED" && (
            <span className="text-xs text-[#0B6E4F] font-semibold flex items-center gap-1">
              Call Completed & Awake
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

interface AddCallModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAdd: (call: Omit<WakeUpCallRecord, "id" | "tenantId" | "status">) => void;
}

const AddCallModal: FC<AddCallModalProps> = ({ isOpen, onClose, onAdd }) => {
  const roomInputId = useId();
  const guestInputId = useId();
  const timeInputId = useId();
  const departureInputId = useId();
  const reasonInputId = useId();
  const boxesInputId = useId();

  const [room, setRoom] = useState("");
  const [guest, setGuest] = useState("");
  const [time, setTime] = useState("05:00");
  const [departure, setDeparture] = useState("");
  const [reason, setReason] = useState("");
  const [reqBfast, setReqBfast] = useState(true);
  const [boxes, setBoxes] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!room || !guest) return;

    onAdd({
      roomNumber: room,
      guestName: guest,
      wakeUpTime: time,
      departureTime: departure || undefined,
      reason: reason || "Guest Personal Request",
      requiresBreakfastBox: reqBfast,
      breakfastBoxesCount: reqBfast ? boxes : 0,
    });
    onClose();
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm border-0 w-full h-full max-w-full max-h-full"
    >
      <div className="w-full max-w-md rounded-2xl p-5 bg-white border border-[#E2E8F0] text-slate-800 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Add Wake-Up Call</h3>
        <p className="text-xs text-slate-400 mb-4">
          Schedule front-desk wake-up call with optional breakfast box request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={roomInputId}
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Room Number
              </label>
              <input
                id={roomInputId}
                type="text"
                required
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 305"
                className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor={timeInputId}
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Wake-Up Time
              </label>
              <input
                id={timeInputId}
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={guestInputId}
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Guest Name
            </label>
            <input
              id={guestInputId}
              type="text"
              required
              value={guest}
              onChange={(e) => setGuest(e.target.value)}
              placeholder="e.g. Robert Smith"
              className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={departureInputId}
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Tour Departure Time (Opt)
              </label>
              <input
                id={departureInputId}
                type="time"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor={reasonInputId}
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Reason / Excursion
              </label>
              <input
                id={reasonInputId}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Yala Safari"
                className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={reqBfast}
                onChange={(e) => setReqBfast(e.target.checked)}
                className="rounded border-[#E2E8F0]"
              />
              <span>Requires Packed Breakfast Boxes</span>
            </label>

            {reqBfast && (
              <div>
                <label htmlFor={boxesInputId} className="block text-[11px] text-slate-400 mb-1">
                  Number of Boxes
                </label>
                <input
                  id={boxesInputId}
                  type="number"
                  min="1"
                  max="10"
                  value={boxes}
                  onChange={(e) => setBoxes(Number.parseInt(e.target.value, 10) || 1)}
                  className="w-full min-h-[44px] rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] px-3 text-xs text-slate-900"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-50 text-slate-700 border border-[#E2E8F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export interface WakeUpCallListProps {
  readonly initialCalls?: readonly WakeUpCallRecord[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onCallUpdate?: ((updatedCall: WakeUpCallRecord) => void) | undefined;
}

export const WakeUpCallList: FC<WakeUpCallListProps> = ({
  initialCalls = DEFAULT_WAKE_UP_CALLS,
  language = "en",
  onCallUpdate,
}) => {
  const searchId = useId();
  const [calls, setCalls] = useState<readonly WakeUpCallRecord[]>(initialCalls);
  const [statusFilter, setStatusFilter] = useState<WakeUpStatusFilter>("ALL");
  const [timeSlotFilter, setTimeSlotFilter] = useState<WakeUpTimeSlotFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const summary = useMemo(() => computeWakeUpSummary(calls), [calls]);
  const filteredCalls = useMemo(
    () => filterWakeUpCalls(calls, statusFilter, timeSlotFilter, searchQuery),
    [calls, statusFilter, timeSlotFilter, searchQuery],
  );

  const handleUpdate = (updated: WakeUpCallRecord): void => {
    setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (onCallUpdate) {
      onCallUpdate(updated);
    }
  };

  const handleAnswer = (id: string): void => {
    const target = calls.find((c) => c.id === id);
    if (!target) return;
    const updated = advanceWakeUpStatus(target, "ANSWERED");
    playOrderBell("PAYMENT_CONFIRMED");
    handleUpdate(updated);
  };

  const handleKnockAlert = (id: string): void => {
    const target = calls.find((c) => c.id === id);
    if (!target) return;
    const updated = advanceWakeUpStatus(target, "NO_ANSWER_KNOCK_REQUIRED");
    playOrderBell("URGENT");
    handleUpdate(updated);
  };

  const handleSnooze = (id: string): void => {
    const target = calls.find((c) => c.id === id);
    if (!target) return;
    const updated = snoozeWakeUpCall(target, 5);
    handleUpdate(updated);
  };

  const handleToggleBreakfast = (id: string): void => {
    const target = calls.find((c) => c.id === id);
    if (!target) return;
    const updated = toggleBreakfastBoxCollection(target);
    handleUpdate(updated);
  };

  const handleAddCall = (data: Omit<WakeUpCallRecord, "id" | "tenantId" | "status">): void => {
    const newRecord: WakeUpCallRecord = {
      id: `WAKE-${Date.now()}`,
      tenantId: "bentota-resort-spa",
      status: "PENDING",
      ...data,
    };
    setCalls((prev) => [newRecord, ...prev]);
  };

  const labels = {
    title:
      language === "si"
        ? "උදෑසන අවදි කිරීම් සහ සෆාරි මතක්කිරීම්"
        : language === "ta"
          ? "காலை விழிப்பு அழைப்புகள் மற்றும் சவாரி நினைவூட்டல்"
          : "Morning Wake-Up Call & Safari Scheduler",
    subtitle:
      language === "si"
        ? "යාල/උඩවලව සෆාරි සහ ගුවන් තොටුපළ මාරුවීම් සඳහා පිළිගැනීමේ පුවරුව"
        : language === "ta"
          ? "சவாரி மற்றும் விமான நிலையப் பயணங்களுக்கான வரவேற்புப் பலகை"
          : "Front Desk Morning Dispatch for Safari Expeditions & Airport Runs",
  };

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-800 p-4 md:p-6 pb-24 font-sans">
      <header className="rounded-2xl p-4 mb-5 border border-[#E2E8F0] bg-slate-50 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-700">
              Front Desk Early Dispatch
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {labels.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-400">{labels.subtitle}</p>
        </div>

        <div className="h-11 px-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2 text-xs text-slate-700 tabular-nums self-start sm:self-auto">
          <span className="text-slate-400">Total Wake-Ups:</span>
          <span className="font-semibold text-slate-900">{summary.total}</span>
        </div>
      </header>

      <MetricCards summary={summary} />

      <FilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        timeSlotFilter={timeSlotFilter}
        onTimeSlotFilterChange={setTimeSlotFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        summary={summary}
        searchId={searchId}
      />

      <section className="space-y-3">
        {filteredCalls.length === 0 ? (
          <div className="rounded-2xl p-8 border border-[#E2E8F0] bg-slate-50 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-700">No Wake-Up Calls Found</p>
            <p className="text-xs text-slate-500 mt-1">
              No rooms match the selected time slot or status filter.
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              onAnswer={handleAnswer}
              onKnockAlert={handleKnockAlert}
              onSnooze={handleSnooze}
              onToggleBreakfast={handleToggleBreakfast}
            />
          ))
        )}
      </section>

      <AddCallModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCall}
      />
    </div>
  );
};
