import { useId, useMemo, useState } from "react";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type MealPlanCode = "RO" | "BB" | "HB" | "FB" | "AI";
export type MealSession = "BREAKFAST" | "LUNCH" | "DINNER";
export type DietaryFlag =
  | "VEGETARIAN"
  | "VEGAN"
  | "HALAL"
  | "JAIN"
  | "GLUTEN_FREE"
  | "NUT_ALLERGY"
  | "SEAFOOD_ALLERGY";

export interface ForecastReservation {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly mealPlan: MealPlanCode;
  readonly adults: number;
  readonly children: number;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly driverAccompanying?: boolean | undefined;
  readonly driverMealsIncluded?: boolean | undefined;
  readonly dietaryNotes?: string | undefined;
  readonly dietaryFlags?: readonly DietaryFlag[] | undefined;
}

export interface MealSessionCount {
  readonly session: MealSession;
  readonly adults: number;
  readonly children: number;
  readonly drivers: number;
  readonly totalCovers: number;
}

interface DayMealForecast {
  readonly date: string;
  readonly dayName: string;
  readonly isToday: boolean;
  readonly breakfast: MealSessionCount;
  readonly lunch: MealSessionCount;
  readonly dinner: MealSessionCount;
  readonly totalDailyCovers: number;
  readonly mealPlanBreakdown: Record<MealPlanCode, number>;
  readonly dietaryBreakdown: Record<DietaryFlag, number>;
  readonly contributingReservations: readonly ForecastReservation[];
}

export interface MealPlanForecastCardProps {
  readonly reservations?: readonly ForecastReservation[] | undefined;
  readonly selectedDate?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly restaurantCapacity?: number | undefined;
  readonly onSelectDate?: ((date: string) => void) | undefined;
  readonly onPrintForecast?: (() => void) | undefined;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers & Mathematics
// ============================================================================

export function addDaysToIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  const d = new Date(Date.UTC(year, month, day + days));
  return d.toISOString().slice(0, 10);
}

function checkInDayMeal(plan: MealPlanCode, session: MealSession): boolean {
  if (session === "DINNER") {
    return plan === "HB" || plan === "FB" || plan === "AI";
  }
  if (session === "LUNCH") {
    return plan === "FB" || plan === "AI";
  }
  return false;
}

function midStayDayMeal(plan: MealPlanCode, session: MealSession): boolean {
  if (session === "BREAKFAST") {
    return plan !== "RO";
  }
  if (session === "LUNCH") {
    return plan === "FB" || plan === "AI";
  }
  return plan === "HB" || plan === "FB" || plan === "AI";
}

export function doesReservationIncludeMeal(
  res: ForecastReservation,
  targetDate: string,
  session: MealSession,
): boolean {
  if (targetDate < res.checkInDate || targetDate > res.checkOutDate) {
    return false;
  }
  if (targetDate === res.checkInDate) {
    return checkInDayMeal(res.mealPlan, session);
  }
  if (targetDate === res.checkOutDate) {
    return session === "BREAKFAST" && res.mealPlan !== "RO";
  }
  return midStayDayMeal(res.mealPlan, session);
}

export function formatDayHeader(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) {
    return "Today";
  }
  if (isoDate === addDaysToIso(todayIso, 1)) {
    return "Tomorrow";
  }
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  const d = new Date(Date.UTC(year, month, day));
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const monthName = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()];
  return `${dayName}, ${day} ${monthName}`;
}

export function computeSessionCovers(
  reservations: readonly ForecastReservation[],
  targetDate: string,
  session: MealSession,
): MealSessionCount {
  let adults = 0;
  let children = 0;
  let drivers = 0;

  for (const res of reservations) {
    if (doesReservationIncludeMeal(res, targetDate, session)) {
      adults += res.adults;
      children += res.children;
      if (res.driverAccompanying && res.driverMealsIncluded) {
        drivers += 1;
      }
    }
  }

  return {
    session,
    adults,
    children,
    drivers,
    totalCovers: adults + children + drivers,
  };
}

function recordDietaryFlags(dietary: Record<DietaryFlag, number>, res: ForecastReservation): void {
  if (res.dietaryFlags) {
    for (const flag of res.dietaryFlags) {
      dietary[flag] = (dietary[flag] ?? 0) + res.adults;
    }
  }
}

export function aggregateDailyStayStats(
  reservations: readonly ForecastReservation[],
  dateStr: string,
): {
  readonly contributing: readonly ForecastReservation[];
  readonly mealPlans: Record<MealPlanCode, number>;
  readonly dietary: Record<DietaryFlag, number>;
} {
  const contributing: ForecastReservation[] = [];
  const mealPlans: Record<MealPlanCode, number> = {
    RO: 0,
    BB: 0,
    HB: 0,
    FB: 0,
    AI: 0,
  };
  const dietary: Record<DietaryFlag, number> = {
    VEGETARIAN: 0,
    VEGAN: 0,
    HALAL: 0,
    JAIN: 0,
    GLUTEN_FREE: 0,
    NUT_ALLERGY: 0,
    SEAFOOD_ALLERGY: 0,
  };

  for (const res of reservations) {
    if (dateStr >= res.checkInDate && dateStr <= res.checkOutDate) {
      contributing.push(res);
      mealPlans[res.mealPlan] = (mealPlans[res.mealPlan] ?? 0) + (res.adults + res.children);
      recordDietaryFlags(dietary, res);
    }
  }

  return { contributing, mealPlans, dietary };
}

export function computeDailyMealForecast(
  reservations: readonly ForecastReservation[],
  dateStr: string,
  todayStr: string,
): DayMealForecast {
  const breakfast = computeSessionCovers(reservations, dateStr, "BREAKFAST");
  const lunch = computeSessionCovers(reservations, dateStr, "LUNCH");
  const dinner = computeSessionCovers(reservations, dateStr, "DINNER");
  const { contributing, mealPlans, dietary } = aggregateDailyStayStats(reservations, dateStr);

  return {
    date: dateStr,
    dayName: formatDayHeader(dateStr, todayStr),
    isToday: dateStr === todayStr,
    breakfast,
    lunch,
    dinner,
    totalDailyCovers: breakfast.totalCovers + lunch.totalCovers + dinner.totalCovers,
    mealPlanBreakdown: mealPlans,
    dietaryBreakdown: dietary,
    contributingReservations: contributing,
  };
}

export function compute7DayMealForecast(
  reservations: readonly ForecastReservation[],
  startDateStr: string,
): readonly DayMealForecast[] {
  const result: DayMealForecast[] = [];
  for (let i = 0; i < 7; i++) {
    const current = addDaysToIso(startDateStr, i);
    result.push(computeDailyMealForecast(reservations, current, startDateStr));
  }
  return result;
}

export function formatDietaryBadge(flag: DietaryFlag): {
  readonly label: string;
  readonly emoji: string;
} {
  switch (flag) {
    case "VEGETARIAN":
      return { label: "Vegetarian", emoji: "🥦" };
    case "VEGAN":
      return { label: "Strict Vegan", emoji: "🌱" };
    case "HALAL":
      return { label: "Halal Certified", emoji: "🥩" };
    case "JAIN":
      return { label: "Jain No Root", emoji: "🍲" };
    case "GLUTEN_FREE":
      return { label: "Gluten-Free", emoji: "🌾" };
    case "NUT_ALLERGY":
      return { label: "Severe Nut Allergy", emoji: "🥜" };
    case "SEAFOOD_ALLERGY":
      return { label: "Seafood Allergy", emoji: "🦐" };
  }
}

// ============================================================================
// Default Sample Reservations for Sri Lankan Hotel Forecast
// ============================================================================

export const DEFAULT_FORECAST_RESERVATIONS: readonly ForecastReservation[] = [
  {
    reservationId: "res-001",
    bookingReference: "KDY-RES-101",
    guestName: "Samantha Wickramasinghe",
    roomNumber: "101",
    mealPlan: "HB",
    adults: 2,
    children: 1,
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-22",
    driverAccompanying: true,
    driverMealsIncluded: true,
    dietaryFlags: ["HALAL"],
    dietaryNotes: "Halal meals requested",
  },
  {
    reservationId: "res-002",
    bookingReference: "KDY-RES-204",
    guestName: "David & Emma Miller",
    roomNumber: "204",
    mealPlan: "BB",
    adults: 2,
    children: 0,
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-24",
    driverAccompanying: false,
    driverMealsIncluded: false,
    dietaryFlags: ["GLUTEN_FREE"],
    dietaryNotes: "Celiac guest, strict gluten-free toast",
  },
  {
    reservationId: "res-003",
    bookingReference: "KDY-RES-302",
    guestName: "Dr. Rohitha Senaratne",
    roomNumber: "302",
    mealPlan: "FB",
    adults: 3,
    children: 2,
    checkInDate: "2026-10-17",
    checkOutDate: "2026-10-21",
    driverAccompanying: true,
    driverMealsIncluded: true,
    dietaryFlags: ["VEGETARIAN"],
    dietaryNotes: "Pure vegetarian for elderly parents",
  },
  {
    reservationId: "res-004",
    bookingReference: "KDY-RES-405",
    guestName: "Hans & Ingrid Mueller",
    roomNumber: "405",
    mealPlan: "AI",
    adults: 2,
    children: 0,
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-26",
    driverAccompanying: false,
    driverMealsIncluded: false,
    dietaryFlags: ["NUT_ALLERGY"],
    dietaryNotes: "Severe peanut allergy, carry EpiPen",
  },
  {
    reservationId: "res-005",
    bookingReference: "KDY-RES-108",
    guestName: "Nihal Jayawardena (Walk-In)",
    roomNumber: "108",
    mealPlan: "RO",
    adults: 1,
    children: 0,
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-20",
    driverAccompanying: false,
    driverMealsIncluded: false,
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface SessionCardProps {
  readonly sessionCount: MealSessionCount;
  readonly title: string;
  readonly timeWindow: string;
  readonly iconEmoji: string;
  readonly capacity: number;
}

function MealSessionCard({
  sessionCount,
  title,
  timeWindow,
  iconEmoji,
  capacity,
}: SessionCardProps) {
  const occupancyPercent =
    capacity > 0 ? Math.min(100, Math.round((sessionCount.totalCovers / capacity) * 100)) : 0;

  const isHighOccupancy = occupancyPercent >= 85;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            {iconEmoji}
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
            <span className="text-[11px] font-mono text-slate-500">{timeWindow}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {sessionCount.totalCovers}
          </span>
          <span className="block text-[10px] text-slate-400">Covers</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center text-xs">
        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
          <span className="block text-[10px] text-slate-400">Adults</span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            {sessionCount.adults}
          </span>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
          <span className="block text-[10px] text-slate-400">Children</span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            {sessionCount.children}
          </span>
        </div>
        <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
          <span className="block text-[10px] text-amber-600 dark:text-amber-400">Drivers</span>
          <span className="font-mono font-bold tabular-nums">{sessionCount.drivers}</span>
        </div>
      </div>

      {/* Seating Capacity Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Seating Capacity ({capacity} seats)</span>
          <span className="font-mono">{occupancyPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isHighOccupancy ? "bg-amber-500" : "bg-blue-600"
            }`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface ManifestTableProps {
  readonly reservations: readonly ForecastReservation[];
  readonly targetDate: string;
}

function ReservationsManifestTable({ reservations, targetDate }: ManifestTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
        No active reservations found for this date.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-3 py-2.5">Room</th>
            <th className="px-3 py-2.5">Guest &amp; Reference</th>
            <th className="px-3 py-2.5">Meal Plan</th>
            <th className="px-3 py-2.5 text-center">Adults</th>
            <th className="px-3 py-2.5 text-center">Children</th>
            <th className="px-3 py-2.5 text-center">Driver Meal</th>
            <th className="px-3 py-2.5">Included Sessions</th>
            <th className="px-3 py-2.5">Dietary Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {reservations.map((res) => {
            const hasB = doesReservationIncludeMeal(res, targetDate, "BREAKFAST");
            const hasL = doesReservationIncludeMeal(res, targetDate, "LUNCH");
            const hasD = doesReservationIncludeMeal(res, targetDate, "DINNER");

            return (
              <tr
                key={res.reservationId}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                  {res.roomNumber}
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {res.guestName}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {res.bookingReference}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {res.mealPlan}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono tabular-nums">{res.adults}</td>
                <td className="px-3 py-2 text-center font-mono tabular-nums">{res.children}</td>
                <td className="px-3 py-2 text-center">
                  {res.driverAccompanying && res.driverMealsIncluded ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Driver Rice &amp; Curry
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        hasB
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                          : "text-slate-300 dark:text-slate-700 line-through"
                      }`}
                    >
                      B
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        hasL
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                          : "text-slate-300 dark:text-slate-700 line-through"
                      }`}
                    >
                      L
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        hasD
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                          : "text-slate-300 dark:text-slate-700 line-through"
                      }`}
                    >
                      D
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-[11px]">
                  {res.dietaryNotes ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      ⚠️ {res.dietaryNotes}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MealPlanForecastCard({
  reservations = DEFAULT_FORECAST_RESERVATIONS,
  selectedDate: initialSelectedDate,
  hotelName = "Earl's Regency Kandy",
  restaurantCapacity = 120,
  onSelectDate,
  onPrintForecast,
  disabled = false,
}: MealPlanForecastCardProps) {
  const todayStr = useMemo(() => {
    return initialSelectedDate ?? "2026-10-19";
  }, [initialSelectedDate]);

  const [activeDate, setActiveDate] = useState(todayStr);
  const printId = useId();

  const sevenDayForecast = useMemo(() => {
    return compute7DayMealForecast(reservations, todayStr);
  }, [reservations, todayStr]);

  const activeDayForecast = useMemo(() => {
    return computeDailyMealForecast(reservations, activeDate, todayStr);
  }, [reservations, activeDate, todayStr]);

  const handleDaySelect = (d: string) => {
    setActiveDate(d);
    onSelectDate?.(d);
  };

  const handlePrint = () => {
    if (onPrintForecast) {
      onPrintForecast();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Extract active dietary flags with count > 0
  const activeDietary = useMemo(() => {
    const list: { flag: DietaryFlag; count: number }[] = [];
    for (const [key, val] of Object.entries(activeDayForecast.dietaryBreakdown)) {
      if (val > 0) {
        list.push({ flag: key as DietaryFlag, count: val });
      }
    }
    return list;
  }, [activeDayForecast.dietaryBreakdown]);

  return (
    <div className="w-full rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              👨‍🍳
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Executive Chef Meal-Plan Headcount Forecast
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {hotelName} • Kitchen Buffet &amp; Set-Menu Daily Preparation Sheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id={printId}
            type="button"
            onClick={handlePrint}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] transition-colors"
          >
            <span>🖨️</span>
            <span>Print Kitchen Dispatch</span>
          </button>
        </div>
      </div>

      {/* 7-Day Pill Bar */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
          7-Day Forecast Window
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {sevenDayForecast.map((day) => {
            const isSelected = day.date === activeDate;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => handleDaySelect(day.date)}
                disabled={disabled}
                className={`p-2.5 rounded-2xl text-left border transition-all min-h-[44px] ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100"
                }`}
              >
                <span className="block text-[11px] font-semibold text-slate-500">
                  {day.dayName}
                </span>
                <span className="block font-mono text-[10px] text-slate-400">{day.date}</span>
                <span className="mt-1 block font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                  {day.totalDailyCovers} covers
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Overview Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-[11px] text-slate-400 block">Selected Preparation Date</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {activeDayForecast.dayName} ({activeDayForecast.date})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Total Expected Covers</span>
            <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {activeDayForecast.totalDailyCovers} pax
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">In-House Roster</span>
            <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {activeDayForecast.contributingReservations.length} rooms
            </span>
          </div>
        </div>
      </div>

      {/* 3 Meal Sessions (Breakfast, Lunch, Dinner) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MealSessionCard
          sessionCount={activeDayForecast.breakfast}
          title="Breakfast Buffet"
          timeWindow="07:00 – 10:30"
          iconEmoji="🍳"
          capacity={restaurantCapacity}
        />
        <MealSessionCard
          sessionCount={activeDayForecast.lunch}
          title="Lunch Buffet / Set"
          timeWindow="12:30 – 15:00"
          iconEmoji="🥗"
          capacity={restaurantCapacity}
        />
        <MealSessionCard
          sessionCount={activeDayForecast.dinner}
          title="Dinner Buffet / Gala"
          timeWindow="19:00 – 22:30"
          iconEmoji="🍛"
          capacity={restaurantCapacity}
        />
      </div>

      {/* Dietary Requirements Strip */}
      {activeDietary.length > 0 && (
        <div className="p-3.5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 space-y-2">
          <span className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Statutory Allergen &amp; Special Diet Headcount for Today</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {activeDietary.map(({ flag, count }) => {
              const badge = formatDietaryBadge(flag);
              return (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <span>{badge.emoji}</span>
                  <span>{badge.label}:</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {count} pax
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Manifest Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          In-House &amp; Arriving Guests Meal Manifest ({activeDayForecast.date})
        </h3>
        <ReservationsManifestTable
          reservations={activeDayForecast.contributingReservations}
          targetDate={activeDayForecast.date}
        />
      </div>
    </div>
  );
}
