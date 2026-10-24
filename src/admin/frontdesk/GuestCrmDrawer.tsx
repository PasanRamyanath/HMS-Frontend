import { useEffect, useId, useMemo, useState } from "react";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type GuestVipTier = "STANDARD" | "SILVER" | "GOLD" | "PLATINUM" | "VIP";

export interface GuestPastStay {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly roomNumber: string;
  readonly roomCategory: string;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly mealPlan: string; // "RO" | "BB" | "HB" | "FB" | "AI"
  readonly totalFolioLkr: number;
  readonly paymentMethod: string;
  readonly rating?: number | undefined; // 1-5
  readonly stayNotes?: string | undefined;
}

export interface GuestProfile {
  readonly id: string;
  readonly fullName: string;
  readonly identityType: "SRI_LANKAN_NIC" | "FOREIGN_PASSPORT";
  readonly identityNumber: string;
  readonly phone: string;
  readonly email?: string | undefined;
  readonly nationality: string;
  readonly countryCode: string; // "LK", "GB", "DE", etc.
  readonly vipTier: GuestVipTier;
  readonly isBlacklisted: boolean;
  readonly blacklistReason?: string | undefined;
  readonly totalStaysCount: number;
  readonly totalNightsStayed: number;
  readonly lifetimeSpendLkr: number;
  readonly roomPreferences: readonly string[];
  readonly dietaryPreferences: readonly string[];
  readonly specialNotes?: string | undefined;
  readonly pastStays: readonly GuestPastStay[];
}

export interface GuestCrmDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialQuery?: string | undefined;
  readonly guests?: readonly GuestProfile[] | undefined;
  readonly onSelectGuest?: ((guest: GuestProfile) => void) | undefined;
  readonly onUpdateBlacklist?:
    | ((guestId: string, isBlacklisted: boolean, reason?: string) => void)
    | undefined;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

function cleanSearchTerm(val: string): string {
  return val.replace(/[\s\-_+()]/g, "").toLowerCase();
}

function normalizeDigits(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (digits.startsWith("94") && digits.length === 11) {
    return digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return digits.slice(1);
  }
  return digits;
}

function matchesPhone(phone: string, cleanQuery: string, normQuery: string): boolean {
  if (normQuery.length >= 7 && normalizeDigits(phone).includes(normQuery)) {
    return true;
  }
  const cleanPhone = cleanSearchTerm(phone);
  return cleanQuery.length >= 7 && cleanPhone.includes(cleanQuery);
}

function matchesGuestProfile(
  p: GuestProfile,
  query: string,
  cleanQuery: string,
  normQuery: string,
): boolean {
  if (p.fullName.toLowerCase().includes(query)) {
    return true;
  }
  if (p.email?.toLowerCase().includes(query)) {
    return true;
  }
  if (cleanSearchTerm(p.identityNumber).includes(cleanQuery)) {
    return true;
  }
  return matchesPhone(p.phone, cleanQuery, normQuery);
}

export function searchGuestProfiles(
  profiles: readonly GuestProfile[],
  rawQuery: string,
): readonly GuestProfile[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) {
    return profiles;
  }

  const cleanQuery = cleanSearchTerm(query);
  const normQuery = normalizeDigits(query);

  return profiles.filter((p) => matchesGuestProfile(p, query, cleanQuery, normQuery));
}

export function computeGuestSpendMetrics(pastStays: readonly GuestPastStay[]): {
  readonly calculatedTotalSpendLkr: number;
  readonly averageDailyRateLkr: number;
  readonly totalNights: number;
} {
  let totalSpend = 0;
  let totalNights = 0;

  for (const stay of pastStays) {
    totalSpend += stay.totalFolioLkr;

    const start = new Date(stay.checkInDate).getTime();
    const end = new Date(stay.checkOutDate).getTime();
    const diffDays = Math.max(1, Math.round((end - start) / 86400000));
    totalNights += diffDays;
  }

  const averageDailyRateLkr = totalNights > 0 ? Math.round(totalSpend / totalNights) : 0;

  return {
    calculatedTotalSpendLkr: totalSpend,
    averageDailyRateLkr,
    totalNights,
  };
}

export function getVipBadgeClasses(tier: GuestVipTier): {
  readonly bg: string;
  readonly text: string;
  readonly border: string;
} {
  switch (tier) {
    case "VIP":
    case "PLATINUM":
      return {
        bg: "bg-purple-100 ",
        text: "text-purple-800 ",
        border: "border-purple-300 ",
      };
    case "GOLD":
      return {
        bg: "bg-amber-100 ",
        text: "text-amber-800 ",
        border: "border-amber-300 ",
      };
    case "SILVER":
      return {
        bg: "bg-slate-200 ",
        text: "text-slate-800 ",
        border: "border-slate-300 ",
      };
    default:
      return {
        bg: "bg-slate-100 ",
        text: "text-slate-600 ",
        border: "border-slate-200 ",
      };
  }
}

// ============================================================================
// Default Sample Presets
// ============================================================================

export const DEFAULT_GUEST_PROFILES: readonly GuestProfile[] = [
  {
    id: "gst-001",
    fullName: "Dr. Rohitha Senaratne",
    identityType: "SRI_LANKAN_NIC",
    identityNumber: "197214502819",
    phone: "+94772345678",
    email: "dr.senaratne@ceylonhealth.lk",
    nationality: "Sri Lankan",
    countryCode: "LK",
    vipTier: "VIP",
    isBlacklisted: false,
    totalStaysCount: 8,
    totalNightsStayed: 22,
    lifetimeSpendLkr: 1485000,
    roomPreferences: [
      "Top Floor (Level 4)",
      "Tea Plantation View",
      "Extra Down Pillows",
      "Late Check-Out",
    ],
    dietaryPreferences: ["Vegetarian", "No MSG", "Ceylon Spices (Mild)"],
    specialNotes: "Chairman of Colombo Medical Council. Complimentary fruit platter upon arrival.",
    pastStays: [
      {
        reservationId: "res-pst-101",
        bookingReference: "KDY-RES-7782",
        roomNumber: "401",
        roomCategory: "Royal Suite",
        checkInDate: "2026-08-12",
        checkOutDate: "2026-08-16",
        mealPlan: "HB",
        totalFolioLkr: 380000,
        paymentMethod: "Commercial Bank Visa",
        rating: 5,
        stayNotes: "Enjoyed tea trail tour arranged by hotel concierge.",
      },
      {
        reservationId: "res-pst-102",
        bookingReference: "KDY-RES-6541",
        roomNumber: "401",
        roomCategory: "Royal Suite",
        checkInDate: "2026-04-10",
        checkOutDate: "2026-04-14",
        mealPlan: "FB",
        totalFolioLkr: 420000,
        paymentMethod: "PayHere Online",
        rating: 5,
      },
    ],
  },
  {
    id: "gst-002",
    fullName: "Alexander James Wright",
    identityType: "FOREIGN_PASSPORT",
    identityNumber: "GB98451234",
    phone: "+447700900123",
    email: "a.wright@londonfin.co.uk",
    nationality: "British",
    countryCode: "GB",
    vipTier: "GOLD",
    isBlacklisted: false,
    totalStaysCount: 3,
    totalNightsStayed: 11,
    lifetimeSpendLkr: 890000,
    roomPreferences: ["King Bed", "Quiet Wing", "High-Speed Wi-Fi"],
    dietaryPreferences: ["Gluten-Free", "Halal Friendly"],
    specialNotes: "Travels with private chauffeur Sunil Jayawardena. Accompanied by spouse Emma.",
    pastStays: [
      {
        reservationId: "res-pst-201",
        bookingReference: "KDY-RES-8812",
        roomNumber: "101",
        roomCategory: "Deluxe Mountain View",
        checkInDate: "2026-01-05",
        checkOutDate: "2026-01-10",
        mealPlan: "BB",
        totalFolioLkr: 345000,
        paymentMethod: "HSBC Mastercard",
        rating: 4,
      },
    ],
  },
  {
    id: "gst-003",
    fullName: "Kamal Nishantha Perera",
    identityType: "SRI_LANKAN_NIC",
    identityNumber: "841203491V",
    phone: "+94719998877",
    email: "kamal.perera@gmail.com",
    nationality: "Sri Lankan",
    countryCode: "LK",
    vipTier: "STANDARD",
    isBlacklisted: true,
    blacklistReason:
      "Unpaid minibar and restaurant damage dispute (LKR 84,000) during stay in Dec 2025. Restrict walk-in without full upfront card pre-auth.",
    totalStaysCount: 1,
    totalNightsStayed: 2,
    lifetimeSpendLkr: 65000,
    roomPreferences: ["Ground Floor"],
    dietaryPreferences: [],
    specialNotes: "Security caution: Flag to Front Desk Manager upon check-in.",
    pastStays: [
      {
        reservationId: "res-pst-301",
        bookingReference: "KDY-RES-4991",
        roomNumber: "104",
        roomCategory: "Superior Garden",
        checkInDate: "2025-12-20",
        checkOutDate: "2025-12-22",
        mealPlan: "RO",
        totalFolioLkr: 65000,
        paymentMethod: "Cash (Partial)",
        rating: 1,
      },
    ],
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface GuestSearchItemProps {
  readonly guest: GuestProfile;
  readonly isSelected: boolean;
  readonly onSelect: (guest: GuestProfile) => void;
}

function GuestSearchItem({ guest, isSelected, onSelect }: GuestSearchItemProps) {
  const vipStyle = getVipBadgeClasses(guest.vipTier);

  return (
    <button
      type="button"
      onClick={() => onSelect(guest)}
      className={`w-full text-left p-3 rounded-2xl border transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50/70 shadow-sm"
          : "border-slate-200 bg-white hover:bg-slate-50 "
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-xs text-slate-900 truncate">{guest.fullName}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${vipStyle.bg} ${vipStyle.text} ${vipStyle.border}`}
            >
              {guest.vipTier}
            </span>
            {guest.isBlacklisted && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 ">
                Blacklisted
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
            <span>{guest.identityNumber}</span>
            <span>•</span>
            <span>{guest.phone}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block">{guest.totalStaysCount} stays</span>
          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
            {formatLkr(guest.lifetimeSpendLkr)}
          </span>
        </div>
      </div>
    </button>
  );
}

interface PreferencesBentoProps {
  readonly guest: GuestProfile;
}

function PreferencesBento({ guest }: PreferencesBentoProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
        <span className="font-bold text-[11px] text-slate-700 block">
          Room &amp; Bed Preferences
        </span>
        {guest.roomPreferences.length === 0 ? (
          <span className="text-slate-400 text-[11px]">No specific room preferences recorded.</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {guest.roomPreferences.map((pref) => (
              <span
                key={pref}
                className="px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-[11px]"
              >
                {pref}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
        <span className="font-bold text-[11px] text-slate-700 block">
          Dietary &amp; Allergen Flags
        </span>
        {guest.dietaryPreferences.length === 0 ? (
          <span className="text-slate-400 text-[11px]">
            Standard dining / No dietary restrictions.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {guest.dietaryPreferences.map((diet) => (
              <span
                key={diet}
                className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]"
              >
                {diet}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PastStayRowProps {
  readonly stay: GuestPastStay;
}

function PastStayRow({ stay }: PastStayRowProps) {
  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="px-3 py-2 font-mono font-bold text-slate-900 ">{stay.bookingReference}</td>
      <td className="px-3 py-2">
        <span className="font-mono font-bold block">{stay.roomNumber}</span>
        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
          {stay.roomCategory}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[11px]">
        {stay.checkInDate} to {stay.checkOutDate}
      </td>
      <td className="px-3 py-2 text-center">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 ">
          {stay.mealPlan}
        </span>
      </td>
      <td className="px-3 py-2 font-mono font-bold text-right tabular-nums">
        {formatLkr(stay.totalFolioLkr)}
      </td>
      <td className="px-3 py-2 text-right">
        {stay.rating ? (
          <span className="text-amber-500 font-bold">{"*".repeat(stay.rating)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

interface SelectedGuestDetailProps {
  readonly guest: GuestProfile;
  readonly onSelectGuest?: ((guest: GuestProfile) => void) | undefined;
  readonly onUpdateBlacklist?:
    | ((guestId: string, isBlacklisted: boolean, reason?: string) => void)
    | undefined;
  readonly onClose: () => void;
  readonly disabled?: boolean | undefined;
}

function SelectedGuestDetail({
  guest,
  onSelectGuest,
  onUpdateBlacklist,
  onClose,
  disabled,
}: SelectedGuestDetailProps) {
  const vipClasses = getVipBadgeClasses(guest.vipTier);
  const avgSpend =
    guest.totalStaysCount > 0 ? Math.round(guest.lifetimeSpendLkr / guest.totalStaysCount) : 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white/70 space-y-4">
      {/* Profile Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 ">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-slate-900 ">{guest.fullName}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${vipClasses.bg} ${vipClasses.text} ${vipClasses.border}`}
            >
              {guest.vipTier}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
            <span>
              {guest.identityType === "SRI_LANKAN_NIC" ? "NIC" : "Passport"}: {guest.identityNumber}
            </span>
            <span>•</span>
            <span>{guest.nationality}</span>
            <span>•</span>
            <span>{guest.phone}</span>
          </div>
        </div>

        {onSelectGuest && (
          <button
            type="button"
            onClick={() => {
              onSelectGuest(guest);
              onClose();
            }}
            disabled={disabled || guest.isBlacklisted}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
              guest.isBlacklisted
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
            }`}
          >
            Select for Booking
          </button>
        )}
      </div>

      {/* Blacklist Alert Banner */}
      {guest.isBlacklisted && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <span>RESTRICTED / BLACKLISTED GUEST</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {guest.blacklistReason ?? "Guest is marked as restricted by front-desk management."}
          </p>
          {onUpdateBlacklist && (
            <button
              type="button"
              onClick={() => onUpdateBlacklist(guest.id, false)}
              disabled={disabled}
              className="text-[10px] font-semibold text-rose-700 underline mt-1 block"
            >
              Clear Blacklist Status
            </button>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 ">
          <span className="text-[10px] text-slate-400 block">Completed Stays</span>
          <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
            {guest.totalStaysCount} stays
          </span>
          <span className="text-[9px] text-slate-500 block">{guest.totalNightsStayed} nights</span>
        </div>

        <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 ">
          <span className="text-[10px] text-slate-400 block">Lifetime Spend</span>
          <span className="font-mono text-base font-bold text-emerald-600 tabular-nums">
            {formatLkr(guest.lifetimeSpendLkr)}
          </span>
          <span className="text-[9px] text-slate-500 block">Total Folios</span>
        </div>

        <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 ">
          <span className="text-[10px] text-slate-400 block">Avg Folio/Stay</span>
          <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
            {formatLkr(avgSpend)}
          </span>
          <span className="text-[9px] text-slate-500 block">High Value</span>
        </div>
      </div>

      {/* Preferences Bento */}
      <PreferencesBento guest={guest} />

      {/* Special Notes */}
      {guest.specialNotes && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 ">
          <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800 ">
            Front-Desk Guest Alert
          </span>
          <p className="mt-0.5 text-[11px]">{guest.specialNotes}</p>
        </div>
      )}

      {/* Past Stays History */}
      <div className="space-y-2">
        <span className="font-bold text-xs text-slate-800 block">
          Past Stay Invoices &amp; Folios ({guest.pastStays.length})
        </span>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 ">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200 ">
              <tr>
                <th className="px-3 py-2">Booking Ref</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2 text-center">Plan</th>
                <th className="px-3 py-2 text-right">Folio (LKR)</th>
                <th className="px-3 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 ">
              {guest.pastStays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                    No historical stay records found.
                  </td>
                </tr>
              ) : (
                guest.pastStays.map((stay) => <PastStayRow key={stay.reservationId} stay={stay} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuestCrmDrawer({
  isOpen,
  onClose,
  initialQuery = "",
  guests = DEFAULT_GUEST_PROFILES,
  onSelectGuest,
  onUpdateBlacklist,
  disabled = false,
}: GuestCrmDrawerProps) {
  const searchInputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(guests[0] ?? null);

  useEffect(() => {
    if (initialQuery.length > 0) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const searchResults = useMemo(() => {
    return searchGuestProfiles(guests, query);
  }, [guests, query]);

  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Guest CRM & History Drawer"
      className="fixed inset-0 z-50 flex justify-end bg-white backdrop-blur-sm border-0 w-full h-full p-0 m-0"
    >
      <div className="w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 ">
                Guest CRM History &amp; Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Repeat guest lookup by NIC, Passport, or Phone
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close Drawer"
          >
            x
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <input
            id={searchInputId}
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by NIC (9/12 digit), Passport No, Phone, or Name..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs min-h-[44px] focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {/* Drawer Body - Split into Search Results and Selected Profile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Search Result Matches Strip */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Matching Guest Profiles ({searchResults.length})
            </span>
            {searchResults.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No guest found matching "{query}". Create a new profile upon check-in.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {searchResults.map((guest) => (
                  <GuestSearchItem
                    key={guest.id}
                    guest={guest}
                    isSelected={selectedGuest?.id === guest.id}
                    onSelect={setSelectedGuest}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Selected Guest Detailed Record */}
          {selectedGuest && (
            <SelectedGuestDetail
              guest={selectedGuest}
              onSelectGuest={onSelectGuest}
              onUpdateBlacklist={onUpdateBlacklist}
              onClose={onClose}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
