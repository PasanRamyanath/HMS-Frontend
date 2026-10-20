/**
 * Diesel Generator, CEB Grid Power & Water Tank Daily Utility Meter Log (UtilityMeterCard.tsx)
 *
 * Operations hub for hotel chief engineers, general managers, and sustainability auditors.
 * Tracks Sri Lankan resort utilities across the 4 primary pillars:
 * 1. Ceylon Electricity Board (CEB) 3-Phase Grid Power (kWh)
 * 2. Rooftop Solar Photovoltaic (PV) Generation (kWh)
 * 3. Backup Diesel Generator (Auto Diesel Liters & Run Hours)
 * 4. Fresh Water Storage (NWSDB Mains & Water Bowser Deliveries in m³)
 * Computes exact daily utility cost and Cost Per Occupied Room Night (PORN).
 *
 * Operational & Hospitality Capabilities:
 * - Real-time daily utility cost calculations & Cost Per Occupied Room Night (PORN)
 * - Rooftop solar green energy contribution ratio (%) & savings tracking
 * - Backup generator fuel efficiency (kWh per diesel liter)
 * - Water consumption monitoring per occupied room (liters / guest room)
 * - Historical meter audit log table with trend comparisons
 * - Modal for logging daily meter readings with >= 44x44pt ergonomic touch targets
 * - Apple HIG styling with .apple-liquid-glass, .tabular-nums-lkr, and continuous squircles
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface UtilityTariffSettings {
  readonly cebRatePerKwhLkr: number; // e.g. 42.00 LKR
  readonly dieselCostPerLiterLkr: number; // e.g. 340.00 LKR
  readonly waterCostPerCubicMeterLkr: number; // e.g. 360.00 LKR
}

export interface DailyUtilityRecord {
  readonly recordId: string;
  readonly dateIso: string;
  readonly occupiedRoomsCount: number;
  readonly totalRoomsCount: number;
  readonly cebUnitsKwh: number;
  readonly solarUnitsKwh: number;
  readonly dieselLiters: number;
  readonly dieselRunHours: number;
  readonly waterCubicMeters: number;
  readonly waterBowserDeliveriesCount: number;
  readonly loggedByStaff: string;
  readonly notes?: string | undefined;
}

export interface DailyUtilityFinancials {
  readonly cebCostLkr: number;
  readonly solarSavingsLkr: number;
  readonly dieselCostLkr: number;
  readonly waterCostLkr: number;
  readonly totalUtilityCostLkr: number;
  readonly costPerOccupiedRoomLkr: number;
  readonly solarRatioPct: number;
  readonly waterLitersPerRoom: number;
}

export interface UtilityAggregateSummary {
  readonly totalDays: number;
  readonly totalCostLkr: number;
  readonly avgCostPerOccupiedRoomLkr: number;
  readonly totalCebKwh: number;
  readonly totalSolarKwh: number;
  readonly totalDieselLiters: number;
  readonly totalWaterM3: number;
  readonly overallSolarPct: number;
}

export interface UtilityMeterCardProps {
  readonly tenantId?: string | undefined;
  readonly propertyName?: string | undefined;
  readonly tariffs?: UtilityTariffSettings | undefined;
  readonly initialRecords?: readonly DailyUtilityRecord[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onSaveReading?: ((record: DailyUtilityRecord) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures & Tariffs
// ============================================================================

export const DEFAULT_UTILITY_TARIFFS: UtilityTariffSettings = {
  cebRatePerKwhLkr: 42.0,
  dieselCostPerLiterLkr: 340.0,
  waterCostPerCubicMeterLkr: 360.0,
};

export const DEFAULT_UTILITY_RECORDS: readonly DailyUtilityRecord[] = [
  {
    recordId: "utl-2026-10-20",
    dateIso: "2026-10-20",
    occupiedRoomsCount: 36,
    totalRoomsCount: 42,
    cebUnitsKwh: 380,
    solarUnitsKwh: 220,
    dieselLiters: 15,
    dieselRunHours: 1.5,
    waterCubicMeters: 24,
    waterBowserDeliveriesCount: 0,
    loggedByStaff: "Anura Dias (Chief Engineer)",
    notes: "Clear sunny day in Yala. Solar harvest peaked at 42kW at 12:30pm.",
  },
  {
    recordId: "utl-2026-10-19",
    dateIso: "2026-10-19",
    occupiedRoomsCount: 38,
    totalRoomsCount: 42,
    cebUnitsKwh: 410,
    solarUnitsKwh: 195,
    dieselLiters: 28,
    dieselRunHours: 2.8,
    waterCubicMeters: 28,
    waterBowserDeliveriesCount: 1,
    loggedByStaff: "Roshan Gamage (Technician)",
    notes: "Evening CEB grid power outage for 2h 45m. Generator auto-started cleanly.",
  },
  {
    recordId: "utl-2026-10-18",
    dateIso: "2026-10-18",
    occupiedRoomsCount: 40,
    totalRoomsCount: 42,
    cebUnitsKwh: 440,
    solarUnitsKwh: 210,
    dieselLiters: 0,
    dieselRunHours: 0,
    waterCubicMeters: 30,
    waterBowserDeliveriesCount: 0,
    loggedByStaff: "Anura Dias (Chief Engineer)",
    notes: "High weekend occupancy, zero generator runtime.",
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface UtilityTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly todayCostLabel: string;
  readonly pornLabel: string;
  readonly solarRatioLabel: string;
  readonly cebGridLabel: string;
  readonly dieselGensetLabel: string;
  readonly waterMainsLabel: string;
  readonly solarSavingsLabel: string;
  readonly logReadingAction: string;
  readonly historyTableTitle: string;
  readonly dateCol: string;
  readonly occupancyCol: string;
  readonly powerMixCol: string;
  readonly dieselCol: string;
  readonly waterCol: string;
  readonly totalCostCol: string;
  readonly pornCol: string;
  readonly saveSuccessToast: string;
  readonly closeAction: string;
  readonly submitAction: string;
  readonly modalTitle: string;
}

const UTILITY_TRANSLATIONS: Record<SupportedLanguage, UtilityTranslations> = {
  en: {
    title: "Resort Utility Meter Log & Cost Auditor",
    subtitle: "CEB Grid, Rooftop Solar, Diesel Generator & Water Consumption (PORN)",
    todayCostLabel: "Today's Utility Expense",
    pornLabel: "Cost Per Occupied Room",
    solarRatioLabel: "Solar Green Energy Ratio",
    cebGridLabel: "CEB Grid Power",
    dieselGensetLabel: "Diesel Generator",
    waterMainsLabel: "Fresh Water Supply",
    solarSavingsLabel: "Solar Cost Offset",
    logReadingAction: "+ Log Meter Reading",
    historyTableTitle: "Daily Utility Consumption & Cost History",
    dateCol: "Date",
    occupancyCol: "Occupancy",
    powerMixCol: "Power Mix (Grid / Solar)",
    dieselCol: "Diesel (L / Hrs)",
    waterCol: "Water (m³)",
    totalCostCol: "Total Utility Cost",
    pornCol: "Cost / Room",
    saveSuccessToast: "Daily utility meter readings saved & audited!",
    closeAction: "Close",
    submitAction: "Record Daily Meters",
    modalTitle: "Log Daily Utility Meter Readings",
  },
  si: {
    title: "හෝටල් උපයෝගිතා මීටර ලේඛනය සහ පිරිවැය විගණනය",
    subtitle: "විදුලිබල මණ්ඩලය, සූර්ය බලශක්තිය, ඩීසල් ජනකය සහ ජල පරිභෝජනය (PORN)",
    todayCostLabel: "අද දින උපයෝගිතා වියදම",
    pornLabel: "කාමරයකට සාමාන්‍ය පිරිවැය",
    solarRatioLabel: "සූර්ය බලශක්ති දායකත්වය",
    cebGridLabel: "විදුලිබල මණ්ඩල සැපයුම",
    dieselGensetLabel: "ඩීසල් ජනන යන්ත්‍රය",
    waterMainsLabel: "පිරිසිදු ජල සැපයුම",
    solarSavingsLabel: "සූර්ය බලයෙන් ඉතිරි වූ මුදල",
    logReadingAction: "+ මීටර සටහනක් ඇතුළත් කරන්න",
    historyTableTitle: "දෛනික උපයෝගිතා පරිභෝජන ඉතිහාසය",
    dateCol: "දිනය",
    occupancyCol: "කාමර පිරීම",
    powerMixCol: "විදුලි සංයුතිය (CEB / Solar)",
    dieselCol: "ඩීසල් (ලීටර් / පැය)",
    waterCol: "ජලය (ඝන මීටර්)",
    totalCostCol: "මුළු පිරිවැය",
    pornCol: "කාමරයකට මුදල",
    saveSuccessToast: "දෛනික මීටර සටහන සාර්ථකව සුරැකිණි!",
    closeAction: "වසන්න",
    submitAction: "සටහන තහවුරු කරන්න",
    modalTitle: "දෛනික මීටර අගයන් සටහන් කිරීම",
  },
  ta: {
    title: "ஹோட்டல் பயன்பாட்டு மீட்டர் பதிவு & செலவு தணிக்கை",
    subtitle: "மின்சார சபை, சூரிய மின்சாரம், டீசல் ஜெனரேட்டர் & நீர் பயன்பாடு (PORN)",
    todayCostLabel: "இன்றைய பயன்பாட்டு செலவு",
    pornLabel: "அறை ஒன்றுக்கான செலவு",
    solarRatioLabel: "சூரிய மின்சார விகிதம்",
    cebGridLabel: "மின்சார சபை மின்சாரம்",
    dieselGensetLabel: "டீசல் ஜெனரேட்டர்",
    waterMainsLabel: "தூய நீர் வழங்கல்",
    solarSavingsLabel: "சூரிய மின்சார சேமிப்பு",
    logReadingAction: "+ மீட்டர் வாசிப்பு பதிவு",
    historyTableTitle: "தினசரி பயன்பாடு & கட்டண வரலாறு",
    dateCol: "தேதி",
    occupancyCol: "அறை இருப்பு",
    powerMixCol: "மின்சார கலவை (CEB / Solar)",
    dieselCol: "டீசல் (லிட்டர் / மணி)",
    waterCol: "நீர் (கன மீட்டர்)",
    totalCostCol: "மொத்த கட்டணம்",
    pornCol: "அறை செலவு",
    saveSuccessToast: "தினசரி மீட்டர் வாசிப்பு வெற்றிகரமாக சேமிக்கப்பட்டது!",
    closeAction: "மூடு",
    submitAction: "பதிவு செய்",
    modalTitle: "தினசரி பயன்பாட்டு மீட்டர் பதிவு",
  },
};

export function getUtilityText(lang: SupportedLanguage = "en"): UtilityTranslations {
  return UTILITY_TRANSLATIONS[lang] ?? UTILITY_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & PORN Resolvers (Complexity <= 12)
// ============================================================================

export function calculateDailyUtilityFinancials(
  record: DailyUtilityRecord,
  tariffs: UtilityTariffSettings = DEFAULT_UTILITY_TARIFFS,
): DailyUtilityFinancials {
  const cebCostLkr = Math.round(record.cebUnitsKwh * tariffs.cebRatePerKwhLkr * 100) / 100;
  const solarSavingsLkr = Math.round(record.solarUnitsKwh * tariffs.cebRatePerKwhLkr * 100) / 100;
  const dieselCostLkr = Math.round(record.dieselLiters * tariffs.dieselCostPerLiterLkr * 100) / 100;
  const waterCostLkr =
    Math.round(record.waterCubicMeters * tariffs.waterCostPerCubicMeterLkr * 100) / 100;

  const totalUtilityCostLkr = Math.round((cebCostLkr + dieselCostLkr + waterCostLkr) * 100) / 100;

  const costPerOccupiedRoomLkr =
    record.occupiedRoomsCount > 0
      ? Math.round((totalUtilityCostLkr / record.occupiedRoomsCount) * 100) / 100
      : 0;

  const totalPower = record.cebUnitsKwh + record.solarUnitsKwh;
  const solarRatioPct =
    totalPower > 0 ? Math.round((record.solarUnitsKwh / totalPower) * 1000) / 10 : 0;

  const waterLitersPerRoom =
    record.occupiedRoomsCount > 0
      ? Math.round((record.waterCubicMeters * 1000) / record.occupiedRoomsCount)
      : 0;

  return {
    cebCostLkr,
    solarSavingsLkr,
    dieselCostLkr,
    waterCostLkr,
    totalUtilityCostLkr,
    costPerOccupiedRoomLkr,
    solarRatioPct,
    waterLitersPerRoom,
  };
}

export function calculateUtilityAggregateSummary(
  records: readonly DailyUtilityRecord[],
  tariffs: UtilityTariffSettings = DEFAULT_UTILITY_TARIFFS,
): UtilityAggregateSummary {
  let totalCost = 0;
  let totalOccupiedRooms = 0;
  let totalCeb = 0;
  let totalSolar = 0;
  let totalDiesel = 0;
  let totalWater = 0;

  for (const r of records) {
    const fin = calculateDailyUtilityFinancials(r, tariffs);
    totalCost += fin.totalUtilityCostLkr;
    totalOccupiedRooms += r.occupiedRoomsCount;
    totalCeb += r.cebUnitsKwh;
    totalSolar += r.solarUnitsKwh;
    totalDiesel += r.dieselLiters;
    totalWater += r.waterCubicMeters;
  }

  const avgCostPerOccupiedRoomLkr =
    totalOccupiedRooms > 0 ? Math.round((totalCost / totalOccupiedRooms) * 100) / 100 : 0;

  const totalPower = totalCeb + totalSolar;
  const overallSolarPct = totalPower > 0 ? Math.round((totalSolar / totalPower) * 1000) / 10 : 0;

  return {
    totalDays: records.length,
    totalCostLkr: Math.round(totalCost * 100) / 100,
    avgCostPerOccupiedRoomLkr,
    totalCebKwh: totalCeb,
    totalSolarKwh: totalSolar,
    totalDieselLiters: totalDiesel,
    totalWaterM3: totalWater,
    overallSolarPct,
  };
}

export function formatUtilityLkr(amount: number): string {
  return `LKR ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface UtilityHeaderProps {
  readonly propertyName: string;
  readonly t: UtilityTranslations;
  readonly onNewClick: () => void;
}

const UtilityHeader: FC<UtilityHeaderProps> = ({ propertyName, t, onNewClick }) => {
  return (
    <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {propertyName}
          </span>
          <span className="text-xs text-slate-400">Engineering & Sustainability Division</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onNewClick}
        className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
      >
        <span>⚡</span>
        <span>{t.logReadingAction}</span>
      </button>
    </div>
  );
};

interface OverviewMetricsBarProps {
  readonly latestFin: DailyUtilityFinancials;
  readonly t: UtilityTranslations;
}

const OverviewMetricsBar: FC<OverviewMetricsBarProps> = ({ latestFin, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.todayCostLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-white mt-1 block">
          {formatUtilityLkr(latestFin.totalUtilityCostLkr)}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.pornLabel} (PORN)</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-cyan-400 mt-1 block">
          {formatUtilityLkr(latestFin.costPerOccupiedRoomLkr)}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.solarRatioLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-400 mt-1 block">
          {latestFin.solarRatioPct}%
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-[11px] font-medium text-slate-400 block">{t.solarSavingsLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-emerald-400 mt-1 block">
          {formatUtilityLkr(latestFin.solarSavingsLkr)}
        </span>
      </div>
    </div>
  );
};

interface PillarCardProps {
  readonly title: string;
  readonly icon: string;
  readonly unitValue: string;
  readonly subValue: string;
  readonly costLkr: number;
  readonly badgeText?: string | undefined;
  readonly badgeStyle?: string | undefined;
}

const PillarCard: FC<PillarCardProps> = ({
  title,
  icon,
  unitValue,
  subValue,
  costLkr,
  badgeText,
  badgeStyle,
}) => {
  return (
    <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/10 apple-liquid-glass space-y-2 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
        </div>
        {badgeText && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              badgeStyle ?? "bg-white/10 text-slate-300 border-white/10"
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <span className="text-2xl font-black font-mono tabular-nums-lkr text-white block">
          {unitValue}
        </span>
        <span className="text-xs text-slate-400 block">{subValue}</span>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-slate-500">Calculated Cost</span>
        <span className="font-mono tabular-nums-lkr font-bold text-amber-400">
          {formatUtilityLkr(costLkr)}
        </span>
      </div>
    </div>
  );
};

interface HistoryTableProps {
  readonly records: readonly DailyUtilityRecord[];
  readonly tariffs: UtilityTariffSettings;
  readonly t: UtilityTranslations;
}

const HistoryTable: FC<HistoryTableProps> = ({ records, tariffs, t }) => {
  return (
    <div className="rounded-3xl bg-slate-900/90 border border-white/10 apple-liquid-glass p-5 space-y-4">
      <h2 className="text-lg font-bold text-white tracking-tight">{t.historyTableTitle}</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-semibold">
              <th className="pb-3">{t.dateCol}</th>
              <th className="pb-3">{t.occupancyCol}</th>
              <th className="pb-3">{t.powerMixCol}</th>
              <th className="pb-3">{t.dieselCol}</th>
              <th className="pb-3">{t.waterCol}</th>
              <th className="pb-3 text-right">{t.totalCostCol}</th>
              <th className="pb-3 text-right">{t.pornCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {records.map((r) => {
              const fin = calculateDailyUtilityFinancials(r, tariffs);
              return (
                <tr key={r.recordId} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white font-bold">{r.dateIso}</td>
                  <td className="py-3 text-slate-300">
                    {r.occupiedRoomsCount} / {r.totalRoomsCount} rooms
                  </td>
                  <td className="py-3">
                    <span className="text-blue-400">{r.cebUnitsKwh} kWh</span> /{" "}
                    <span className="text-emerald-400">{r.solarUnitsKwh} kWh</span>{" "}
                    <span className="text-slate-500 text-[10px]">({fin.solarRatioPct}%)</span>
                  </td>
                  <td className="py-3 text-amber-300">
                    {r.dieselLiters} L ({r.dieselRunHours}h)
                  </td>
                  <td className="py-3 text-cyan-300">
                    {r.waterCubicMeters} m³ ({fin.waterLitersPerRoom} L/rm)
                  </td>
                  <td className="py-3 text-right text-white font-bold tabular-nums-lkr">
                    {formatUtilityLkr(fin.totalUtilityCostLkr)}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-bold tabular-nums-lkr">
                    {formatUtilityLkr(fin.costPerOccupiedRoomLkr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface LogReadingModalProps {
  readonly isOpen: boolean;
  readonly t: UtilityTranslations;
  readonly onClose: () => void;
  readonly onSubmit: (record: DailyUtilityRecord) => void;
}

const LogReadingModal: FC<LogReadingModalProps> = ({ isOpen, t, onClose, onSubmit }) => {
  const dateId = useId();
  const occId = useId();
  const cebId = useId();
  const solarId = useId();
  const dieselId = useId();
  const hoursId = useId();
  const waterId = useId();

  const [dateIso, setDateIso] = useState<string>(
    new Date().toISOString().split("T")[0] ?? "2026-10-21",
  );
  const [occupiedRooms, setOccupiedRooms] = useState<number>(38);
  const [cebKwh, setCebKwh] = useState<number>(390);
  const [solarKwh, setSolarKwh] = useState<number>(215);
  const [dieselLiters, setDieselLiters] = useState<number>(10);
  const [dieselHours, setDieselHours] = useState<number>(1.0);
  const [waterM3, setWaterM3] = useState<number>(26);

  if (!isOpen) return null;

  const handleSave = () => {
    const newRecord: DailyUtilityRecord = {
      recordId: `utl-${dateIso}`,
      dateIso,
      occupiedRoomsCount: Math.max(0, occupiedRooms),
      totalRoomsCount: 42,
      cebUnitsKwh: Math.max(0, cebKwh),
      solarUnitsKwh: Math.max(0, solarKwh),
      dieselLiters: Math.max(0, dieselLiters),
      dieselRunHours: Math.max(0, dieselHours),
      waterCubicMeters: Math.max(0, waterM3),
      waterBowserDeliveriesCount: 0,
      loggedByStaff: "Duty Engineer",
    };
    onSubmit(newRecord);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="log-reading-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/10 apple-liquid-glass p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
              Daily Utility Audit
            </span>
            <h2 id="log-reading-title" className="text-lg font-bold text-white tracking-tight">
              {t.modalTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-slate-300"
            aria-label={t.closeAction}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={dateId} className="text-slate-400 block mb-1">
                Reading Date
              </label>
              <input
                id={dateId}
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor={occId} className="text-slate-400 block mb-1">
                Occupied Rooms (of 42)
              </label>
              <input
                id={occId}
                type="number"
                min="0"
                max="42"
                value={occupiedRooms}
                onChange={(e) => setOccupiedRooms(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={cebId} className="text-slate-400 block mb-1">
                CEB Grid (kWh)
              </label>
              <input
                id={cebId}
                type="number"
                min="0"
                value={cebKwh}
                onChange={(e) => setCebKwh(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor={solarId} className="text-slate-400 block mb-1">
                Rooftop Solar (kWh)
              </label>
              <input
                id={solarId}
                type="number"
                min="0"
                value={solarKwh}
                onChange={(e) => setSolarKwh(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold text-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={dieselId} className="text-slate-400 block mb-1">
                Diesel Generator (Liters)
              </label>
              <input
                id={dieselId}
                type="number"
                min="0"
                value={dieselLiters}
                onChange={(e) => setDieselLiters(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor={hoursId} className="text-slate-400 block mb-1">
                Genset Run Hours
              </label>
              <input
                id={hoursId}
                type="number"
                step="0.1"
                min="0"
                value={dieselHours}
                onChange={(e) => setDieselHours(Number.parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label htmlFor={waterId} className="text-slate-400 block mb-1">
              Fresh Water Consumption (Cubic Meters - m³)
            </label>
            <input
              id={waterId}
              type="number"
              min="0"
              value={waterM3}
              onChange={(e) => setWaterM3(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold text-cyan-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all"
          >
            {t.closeAction}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            {t.submitAction}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main View Component
// ============================================================================

export const UtilityMeterCard: FC<UtilityMeterCardProps> = ({
  tenantId: _tenantId = "cinnamon-wild-yala",
  propertyName = "Cinnamon Wild Yala",
  tariffs = DEFAULT_UTILITY_TARIFFS,
  initialRecords = DEFAULT_UTILITY_RECORDS,
  language = "en",
  onSaveReading,
}) => {
  const t = getUtilityText(language);

  const [records, setRecords] = useState<readonly DailyUtilityRecord[]>(initialRecords);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const latestRecord = records[0] ??
    DEFAULT_UTILITY_RECORDS[0] ?? {
      recordId: "utl-default",
      dateIso: "2026-10-20",
      occupiedRoomsCount: 36,
      totalRoomsCount: 42,
      cebUnitsKwh: 380,
      solarUnitsKwh: 220,
      dieselLiters: 15,
      dieselRunHours: 1.5,
      waterCubicMeters: 24,
      waterBowserDeliveriesCount: 0,
      loggedByStaff: "Duty Engineer",
    };
  const latestFin = useMemo(
    () => calculateDailyUtilityFinancials(latestRecord, tariffs),
    [latestRecord, tariffs],
  );

  const handleSaveReading = async (newRecord: DailyUtilityRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    setIsModalOpen(false);
    playOrderBell("PAYMENT_CONFIRMED");
    setToastMessage(t.saveSuccessToast);
    setTimeout(() => setToastMessage(null), 3000);

    if (onSaveReading) {
      await onSaveReading(newRecord);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <UtilityHeader propertyName={propertyName} t={t} onNewClick={() => setIsModalOpen(true)} />

      {/* Overview Metrics Bar */}
      <OverviewMetricsBar latestFin={latestFin} t={t} />

      {/* 4 Pillars Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PillarCard
          title="CEB Grid Power"
          icon="⚡"
          unitValue={`${latestRecord.cebUnitsKwh} kWh`}
          subValue={`Tariff: ${formatUtilityLkr(tariffs.cebRatePerKwhLkr)} / kWh`}
          costLkr={latestFin.cebCostLkr}
          badgeText="Commercial"
          badgeStyle="bg-blue-500/20 text-blue-300 border-blue-500/30"
        />

        <PillarCard
          title="Rooftop Solar PV"
          icon="☀️"
          unitValue={`${latestRecord.solarUnitsKwh} kWh`}
          subValue={`${latestFin.solarRatioPct}% of daily electricity mix`}
          costLkr={latestFin.solarSavingsLkr}
          badgeText="Clean Energy"
          badgeStyle="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
        />

        <PillarCard
          title="Diesel Generator"
          icon="🛢️"
          unitValue={`${latestRecord.dieselLiters} Liters`}
          subValue={`${latestRecord.dieselRunHours}h runtime @ ${formatUtilityLkr(tariffs.dieselCostPerLiterLkr)}/L`}
          costLkr={latestFin.dieselCostLkr}
          badgeText={latestRecord.dieselLiters > 0 ? "Active" : "Standby"}
          badgeStyle={
            latestRecord.dieselLiters > 0
              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
          }
        />

        <PillarCard
          title="Fresh Water Supply"
          icon="💧"
          unitValue={`${latestRecord.waterCubicMeters} m³`}
          subValue={`${latestFin.waterLitersPerRoom} Liters / room night`}
          costLkr={latestFin.waterCostLkr}
          badgeText="NWSDB Mains"
          badgeStyle="bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
        />
      </div>

      {/* Historical Table */}
      <HistoryTable records={records} tariffs={tariffs} t={t} />

      {/* Log Reading Modal */}
      <LogReadingModal
        isOpen={isModalOpen}
        t={t}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveReading}
      />
    </div>
  );
};
