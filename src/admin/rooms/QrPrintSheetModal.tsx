import { useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { generateQrSvg, renderRoomStandQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type PrintLayoutType = "TENT_CARD_2UP" | "TABLE_STICKER_6UP" | "MINI_BADGE_12UP";

export interface QrPrintItem {
  readonly id: string;
  readonly label: string; // e.g. "Room 101", "Table T-01", "Pool Lounger 4"
  readonly subLabel?: string | undefined; // e.g. "Ocean Wing", "Infinity Pool"
  readonly qrUrl: string;
}

export interface QrPrintSheetOptions {
  readonly hotelName: string;
  readonly layout: PrintLayoutType;
  readonly includeWifi: boolean;
  readonly wifiSsid?: string | undefined;
  readonly wifiPassword?: string | undefined;
  readonly showTrilingualCallout: boolean;
}

export interface QrPrintSheetModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly items: ReadonlyArray<QrPrintItem>;
  readonly hotelName?: string | undefined;
  readonly defaultLayout?: PrintLayoutType | undefined;
}

// ============================================================================
// Domain Functions
// ============================================================================

export const DEFAULT_PRINT_ITEMS: ReadonlyArray<QrPrintItem> = [
  {
    id: "item-101",
    label: "Room 101",
    subLabel: "Ocean Wing",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-room-101",
  },
  {
    id: "item-102",
    label: "Room 102",
    subLabel: "Ocean Wing",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-room-102",
  },
  {
    id: "item-t01",
    label: "Table T-01",
    subLabel: "Ocean Breeze Restaurant",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-table-t01",
  },
  {
    id: "item-t02",
    label: "Table T-02",
    subLabel: "Ocean Breeze Restaurant",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-table-t02",
  },
  {
    id: "item-p01",
    label: "Lounger P-01",
    subLabel: "Infinity Pool Deck",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-pool-p01",
  },
  {
    id: "item-cabana-1",
    label: "Cabana 1",
    subLabel: "Beachfront",
    qrUrl: "https://stay.resort.lk/qr/demo/loc-cabana-1",
  },
];

export function validatePrintOptions(options: QrPrintSheetOptions): {
  isValid: boolean;
  error?: string;
} {
  if (!options.hotelName || options.hotelName.trim().length === 0) {
    return { isValid: false, error: "Hotel property name cannot be empty." };
  }
  if (options.includeWifi && (!options.wifiSsid || options.wifiSsid.trim().length === 0)) {
    return { isValid: false, error: "WiFi SSID is required when WiFi credentials are enabled." };
  }
  return { isValid: true };
}

export function renderTableStickerSvg(item: QrPrintItem, options: QrPrintSheetOptions): string {
  const qrSvg = generateQrSvg(item.qrUrl, {
    size: 420,
    centerBadgeText: item.label,
  });

  const wifiBlock =
    options.includeWifi && options.wifiSsid
      ? `<text x="300" y="700" font-family="-apple-system, sans-serif" font-size="16" text-anchor="middle" fill="#8e8e93">WiFi: ${options.wifiSsid} ${options.wifiPassword ? `• Pass: ${options.wifiPassword}` : ""}</text>`
      : "";

  const trilingualBlock = options.showTrilingualCallout
    ? `<text x="300" y="740" font-family="'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif" font-size="14" text-anchor="middle" fill="#636366">ස්කෑන් කර ඇණවුම් කරන්න • ஸ்கேன் செய்து ஆர்டர் செய்க</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
    <rect width="600" height="800" rx="32" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
    <text x="300" y="70" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="800" font-size="28" text-anchor="middle" fill="#0f172a">${options.hotelName}</text>
    <rect x="200" y="95" width="200" height="32" rx="16" fill="#0071e3" fill-opacity="0.12"/>
    <text x="300" y="117" font-family="-apple-system, sans-serif" font-weight="700" font-size="16" text-anchor="middle" fill="#0071e3">${item.label}</text>
    ${item.subLabel ? `<text x="300" y="150" font-family="-apple-system, sans-serif" font-size="14" text-anchor="middle" fill="#64748b">${item.subLabel}</text>` : ""}
    <g transform="translate(90, 180)">
      ${qrSvg}
    </g>
    <text x="300" y="660" font-family="-apple-system, sans-serif" font-weight="700" font-size="22" text-anchor="middle" fill="#0f172a">Scan with Phone Camera</text>
    ${wifiBlock}
    ${trilingualBlock}
  </svg>`;
}

// ============================================================================
// Subcomponent: Item Preview Card
// ============================================================================

interface PrintItemCardProps {
  readonly item: QrPrintItem;
  readonly options: QrPrintSheetOptions;
}

function PrintItemCard({ item, options }: PrintItemCardProps) {
  const isTent = options.layout === "TENT_CARD_2UP";

  const svgMarkup = isTent
    ? renderRoomStandQrSvg({
        hotelName: options.hotelName,
        roomNumber: item.label.replace(/[^0-9]/g, "") || item.label,
        qrUrl: item.qrUrl,
      })
    : renderTableStickerSvg(item, options);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between p-2 hover:shadow-md transition-shadow">
      <div
        className="w-full aspect-[3/4] flex items-center justify-center overflow-hidden"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: pure trusted SVG
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <div className="pt-1.5 text-center border-t border-slate-100">
        <span className="text-xs font-bold text-slate-800 block truncate">{item.label}</span>
        {item.subLabel && (
          <span className="text-[10px] text-slate-400 block truncate">{item.subLabel}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: QrPrintSheetModal
// ============================================================================

const LAYOUT_OPTIONS: ReadonlyArray<SegmentedControlOption<PrintLayoutType>> = [
  { id: "TENT_CARD_2UP", label: "Tent Card (2/Page)" },
  { id: "TABLE_STICKER_6UP", label: "Acrylic Stand (6/Page)" },
  { id: "MINI_BADGE_12UP", label: "Mini Badge (12/Page)" },
];

export function QrPrintSheetModal({
  isOpen,
  onClose,
  items,
  hotelName = "Amaya Beachfront Resort & Spa",
  defaultLayout = "TABLE_STICKER_6UP",
}: QrPrintSheetModalProps) {
  const activeItems = items.length > 0 ? items : DEFAULT_PRINT_ITEMS;

  const [layout, setLayout] = useState<PrintLayoutType>(defaultLayout);
  const [currentHotelName, setCurrentHotelName] = useState(hotelName);
  const [includeWifi, setIncludeWifi] = useState(true);
  const [wifiSsid, setWifiSsid] = useState("AmayaGuest_HighSpeed");
  const [wifiPassword, setWifiPassword] = useState("Amaya2026");
  const [showTrilingualCallout, setShowTrilingualCallout] = useState(true);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(activeItems.map((i) => i.id)),
  );

  const printOptions: QrPrintSheetOptions = {
    hotelName: currentHotelName,
    layout,
    includeWifi,
    wifiSsid: includeWifi ? wifiSsid : undefined,
    wifiPassword: includeWifi ? wifiPassword : undefined,
    showTrilingualCallout,
  };

  const selectedItems = activeItems.filter((i) => selectedIds.has(i.id));

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(activeItems.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const gridColsClass =
    layout === "TENT_CARD_2UP"
      ? "grid-cols-1 sm:grid-cols-2"
      : layout === "TABLE_STICKER_6UP"
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-3 sm:grid-cols-4";

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Printable Acrylic Stand & Table Sticker QR Sheet Generator"
      description="Render print-ready A4 sheets with high-contrast vector QR cards and trilingual scan callouts."
      size="xl"
    >
      <div className="space-y-4 pt-2 font-sf-pro">
        {/* Controls Bar */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Sheet Layout Format
              </span>
              <SegmentedControl
                options={LAYOUT_OPTIONS}
                value={layout}
                onChange={(l) => setLayout(l)}
                fullWidth
                ariaLabel="Print Sheet Layout"
              />
            </div>

            <div>
              <label
                htmlFor="hotel-header-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
              >
                Printed Hotel Header
              </label>
              <input
                id="hotel-header-name"
                type="text"
                value={currentHotelName}
                onChange={(e) => setCurrentHotelName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs min-h-[40px]"
              />
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrilingualCallout}
                  onChange={(e) => setShowTrilingualCallout(e.target.checked)}
                  className="w-4 h-4 rounded text-apple-blue"
                />
                Trilingual Prompt (EN, SI, TA)
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWifi}
                  onChange={(e) => setIncludeWifi(e.target.checked)}
                  className="w-4 h-4 rounded text-apple-blue"
                />
                Include Guest WiFi Details
              </label>
            </div>
          </div>

          {includeWifi && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 dark:border-white/5">
              <div>
                <label
                  htmlFor="wifi-ssid"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  WiFi Network SSID
                </label>
                <input
                  id="wifi-ssid"
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wifi-pass"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  WiFi Password (Optional)
                </label>
                <input
                  id="wifi-pass"
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Selection Bar */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Selected for Sheet:{" "}
            <strong className="text-apple-blue font-bold tabular-nums-lkr">
              {selectedItems.length} of {activeItems.length}
            </strong>{" "}
            locations
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-apple-blue hover:underline cursor-pointer font-medium"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-white/20">&bull;</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs text-slate-500 hover:underline cursor-pointer font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Item Selection Pills */}
        <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
          {activeItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggleItem(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-apple-blue text-white shadow-xs"
                    : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200/60"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Print Sheet A4 Preview Grid */}
        <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 max-h-[380px] overflow-y-auto">
          {selectedItems.length === 0 ? (
            <GlassCard material="regular" radius="lg" className="p-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No locations selected. Choose items above to preview the A4 print sheet.
              </p>
            </GlassCard>
          ) : (
            <div className={`grid ${gridColsClass} gap-3`}>
              {selectedItems.map((item) => (
                <PrintItemCard key={item.id} item={item} options={printOptions} />
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-white/10">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Formatted for standard A4 landscape or portrait print stock (210 &times; 297 mm).
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedItems.length === 0}
              className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-xs font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print A4 Sheet ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}
