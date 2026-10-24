import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { generateQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type QrLocationType = "IN_ROOM" | "RESTAURANT_TABLE" | "POOL_LOUNGER" | "LOBBY_COUNTER";

export interface QrLocation {
  readonly id: string;
  readonly label: string; // e.g. "Table T-01", "Sunbed P-04"
  readonly locationType: QrLocationType;
  readonly outletOrZone: string; // e.g. "Ocean Bistro", "Infinity Pool"
  readonly qrPayloadUrl: string; // e.g. "https://resort.lk/qr/stay-1/loc-101"
  readonly qrTokenSecret: string;
  readonly isActive: boolean;
  readonly orderingEnabled: boolean;
  readonly serviceCallingEnabled: boolean;
  readonly notes?: string | undefined;
}

export interface BulkCreateQrLocationConfig {
  readonly prefix: string; // e.g. "Table T-" or "Lounger P-"
  readonly startNumber: number; // e.g. 1
  readonly endNumber: number; // e.g. 15
  readonly locationType: QrLocationType;
  readonly outletOrZone: string;
  readonly baseUrl: string;
  readonly orderingEnabled: boolean;
  readonly serviceCallingEnabled: boolean;
}

export interface QrLocationManagerProps {
  readonly initialLocations?: ReadonlyArray<QrLocation> | undefined;
  readonly hotelBaseUrl?: string | undefined;
  readonly onSaveLocations?:
    | ((locations: ReadonlyArray<QrLocation>) => Promise<void> | void)
    | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

// ============================================================================
// Default Hospitality Presets
// ============================================================================

export const DEFAULT_QR_LOCATIONS: ReadonlyArray<QrLocation> = [
  {
    id: "loc-table-t01",
    label: "Table T-01",
    locationType: "RESTAURANT_TABLE",
    outletOrZone: "Ocean Breeze Restaurant",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-table-t01",
    qrTokenSecret: "sec-tbl-01-9a4f",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: true,
    notes: "Terrace sea view 4-seater table.",
  },
  {
    id: "loc-table-t02",
    label: "Table T-02",
    locationType: "RESTAURANT_TABLE",
    outletOrZone: "Ocean Breeze Restaurant",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-table-t02",
    qrTokenSecret: "sec-tbl-02-8c1b",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: true,
  },
  {
    id: "loc-pool-p01",
    label: "Lounger P-01",
    locationType: "POOL_LOUNGER",
    outletOrZone: "Infinity Pool Deck",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-pool-p01",
    qrTokenSecret: "sec-pool-01-3e2a",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: true,
    notes: "Sunbed with towel service and mocktail ordering.",
  },
  {
    id: "loc-pool-p02",
    label: "Lounger P-02",
    locationType: "POOL_LOUNGER",
    outletOrZone: "Infinity Pool Deck",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-pool-p02",
    qrTokenSecret: "sec-pool-02-7f9d",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: true,
  },
  {
    id: "loc-bar-01",
    label: "Lobby Bar #1",
    locationType: "LOBBY_COUNTER",
    outletOrZone: "Ceylon Tea Lounge & Bar",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-bar-01",
    qrTokenSecret: "sec-bar-01-4b11",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: false,
    notes: "High stool bar counter.",
  },
  {
    id: "loc-room-101",
    label: "Room 101",
    locationType: "IN_ROOM",
    outletOrZone: "Ocean Wing",
    qrPayloadUrl: "https://stay.resort.lk/qr/tenant-demo/loc-room-101",
    qrTokenSecret: "sec-rm-101-aa23",
    isActive: true,
    orderingEnabled: true,
    serviceCallingEnabled: true,
    notes: "Master guest suite stand.",
  },
];

// ============================================================================
// Domain Functions
// ============================================================================

export function getLocationTypeBadgeColor(type: QrLocationType): StatusColor {
  switch (type) {
    case "IN_ROOM":
      return "blue";
    case "RESTAURANT_TABLE":
      return "amber";
    case "POOL_LOUNGER":
      return "green";
    case "LOBBY_COUNTER":
      return "indigo";
  }
}

export function getLocationTypeLabel(type: QrLocationType): string {
  switch (type) {
    case "IN_ROOM":
      return "In-Room";
    case "RESTAURANT_TABLE":
      return "Restaurant Table";
    case "POOL_LOUNGER":
      return "Pool Lounger";
    case "LOBBY_COUNTER":
      return "Lobby / Bar";
  }
}

export function generateBulkQrLocations(
  config: BulkCreateQrLocationConfig,
): ReadonlyArray<QrLocation> {
  const result: QrLocation[] = [];
  const start = Math.min(config.startNumber, config.endNumber);
  const end = Math.max(config.startNumber, config.endNumber);

  for (let num = start; num <= end; num++) {
    const formattedNum = num < 10 ? `0${num}` : `${num}`;
    const label = `${config.prefix}${formattedNum}`;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `loc-${slug}`;
    const base = config.baseUrl.replace(/\/+$/, "");

    result.push({
      id,
      label,
      locationType: config.locationType,
      outletOrZone: config.outletOrZone.trim(),
      qrPayloadUrl: `${base}/${id}`,
      qrTokenSecret: `sec-${slug}-${Math.random().toString(16).slice(2, 6)}`,
      isActive: true,
      orderingEnabled: config.orderingEnabled,
      serviceCallingEnabled: config.serviceCallingEnabled,
    });
  }

  return result;
}

export function validateQrLocation(
  loc: Partial<QrLocation>,
  existing: ReadonlyArray<QrLocation>,
  currentId?: string,
): { isValid: boolean; error?: string } {
  if (!loc.label || loc.label.trim().length === 0) {
    return { isValid: false, error: "Location label is required." };
  }

  const normalized = loc.label.trim().toLowerCase();
  const isDuplicate = existing.some(
    (l) => l.id !== currentId && l.label.trim().toLowerCase() === normalized,
  );
  if (isDuplicate) {
    return { isValid: false, error: `Location "${loc.label}" already exists.` };
  }

  if (!loc.outletOrZone || loc.outletOrZone.trim().length === 0) {
    return { isValid: false, error: "Outlet or zone designation is required." };
  }

  if (!loc.qrPayloadUrl || loc.qrPayloadUrl.trim().length === 0) {
    return { isValid: false, error: "QR payload URL is required." };
  }

  return { isValid: true };
}

// ============================================================================
// Subcomponent: QR Location Card
// ============================================================================

interface QrLocationCardProps {
  readonly location: QrLocation;
  readonly onPreviewQr: (location: QrLocation) => void;
  readonly onEdit: (location: QrLocation) => void;
  readonly onDelete: (locationId: string) => void;
  readonly onToggleActive: (locationId: string) => void;
  readonly onToggleOrdering: (locationId: string) => void;
  readonly readOnly?: boolean | undefined;
}

function QrLocationCard({
  location,
  onPreviewQr,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleOrdering,
  readOnly,
}: QrLocationCardProps) {
  const badgeColor = getLocationTypeBadgeColor(location.locationType);
  const typeLabel = getLocationTypeLabel(location.locationType);

  return (
    <GlassCard
      material="regular"
      radius="lg"
      className={`p-3.5 flex flex-col justify-between gap-3 transition-apple-spring hover:shadow-md border ${
        location.isActive ? "border-slate-200/70 " : "border-slate-200/40 opacity-60"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/50 ">
          <div>
            <span className="text-base font-bold text-slate-900 tracking-tight block">
              {location.label}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[140px]">
              {location.outletOrZone}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <StatusBadge
              status={location.locationType}
              label={typeLabel}
              color={badgeColor}
              size="sm"
            />
            {!location.isActive && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-500">
                Disabled
              </span>
            )}
          </div>
        </div>

        {/* URL and capability pills */}
        <div className="pt-2 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 truncate">
            <svg
              className="w-3 h-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="truncate">{location.qrPayloadUrl}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {location.orderingEnabled ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                Self-Ordering
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/50 text-slate-400 font-medium">
                Menu View Only
              </span>
            )}

            {location.serviceCallingEnabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B6E4F]/10 text-[#0B6E4F] font-medium">
                Waiter Call
              </span>
            )}
          </div>

          {location.notes && (
            <p className="text-[11px] italic text-slate-500 pt-0.5 line-clamp-1">
              {location.notes}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 ">
        <button
          type="button"
          onClick={() => onPreviewQr(location)}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200/70 transition-colors min-h-[32px] cursor-pointer flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          QR Code
        </button>

        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleOrdering(location.id)}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 min-h-[32px] cursor-pointer"
            >
              {location.orderingEnabled ? "Disable Order" : "Enable Order"}
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(location.id)}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 min-h-[32px] cursor-pointer"
            >
              {location.isActive ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={() => onEdit(location)}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#0B6E4F]/10 text-[#0B6E4F] font-medium hover:bg-[#0B6E4F]/20 transition-colors min-h-[32px] cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(location.id)}
              className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors min-h-[32px] cursor-pointer"
              aria-label={`Delete ${location.label}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: QR Code Preview Modal
// ============================================================================

interface QrPreviewModalProps {
  readonly location: QrLocation | null;
  readonly onClose: () => void;
}

function QrPreviewModal({ location, onClose }: QrPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!location) return null;

  const svgContent = generateQrSvg(location.qrPayloadUrl, {
    size: 512,
    foregroundColor: "#0f172a",
    backgroundColor: "#ffffff",
    centerBadgeText: "SCAN TO ORDER",
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(location.qrPayloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // safe fallback
    }
  };

  return (
    <DialogModal
      isOpen={Boolean(location)}
      onClose={onClose}
      title={`${location.label} — Contactless QR Code`}
      description={`Scan to launch guest room service, restaurant ordering or pool service in ${location.outletOrZone}.`}
      size="sm"
    >
      <div className="space-y-4 pt-2 text-center">
        {/* Crisp Vector QR */}
        <div className="p-4 rounded-2xl bg-white shadow-inner border border-slate-200 inline-block mx-auto max-w-[280px]">
          <div
            className="w-full aspect-square"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted pure SVG output generated from internal math
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono text-slate-500 break-all block px-4">
            {location.qrPayloadUrl}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copied ? "Link Copied!" : "Copy QR Link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Subcomponent: Add / Edit Single Location Modal
// ============================================================================

interface SingleLocationModalProps {
  readonly isOpen: boolean;
  readonly initialData: QrLocation | null;
  readonly existingLocations: ReadonlyArray<QrLocation>;
  readonly defaultBaseUrl: string;
  readonly onClose: () => void;
  readonly onSave: (location: QrLocation) => void;
}

const TYPE_OPTIONS: ReadonlyArray<SegmentedControlOption<QrLocationType>> = [
  { id: "RESTAURANT_TABLE", label: "Restaurant Table" },
  { id: "POOL_LOUNGER", label: "Pool Lounger" },
  { id: "LOBBY_COUNTER", label: "Lobby / Bar" },
  { id: "IN_ROOM", label: "In-Room" },
];

function buildLocationCandidate(
  initialId: string | undefined,
  label: string,
  locationType: QrLocationType,
  outletOrZone: string,
  qrPayloadUrl: string,
  isActive: boolean,
  orderingEnabled: boolean,
  serviceCallingEnabled: boolean,
  notes: string,
): QrLocation {
  const clean = (val: string) => {
    const t = val.trim();
    return t.length > 0 ? t : undefined;
  };

  return {
    id:
      initialId ??
      `loc-${label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`,
    label: label.trim(),
    locationType,
    outletOrZone: outletOrZone.trim(),
    qrPayloadUrl: qrPayloadUrl.trim(),
    qrTokenSecret: `sec-${Math.random().toString(16).slice(2, 8)}`,
    isActive,
    orderingEnabled,
    serviceCallingEnabled,
    notes: clean(notes),
  };
}

function SingleLocationModal({
  isOpen,
  initialData,
  existingLocations,
  defaultBaseUrl,
  onClose,
  onSave,
}: SingleLocationModalProps) {
  const labelId = useId();
  const zoneId = useId();
  const urlId = useId();
  const notesId = useId();

  const [label, setLabel] = useState(() => initialData?.label ?? "");
  const [locationType, setLocationType] = useState<QrLocationType>(
    () => initialData?.locationType ?? "RESTAURANT_TABLE",
  );
  const [outletOrZone, setOutletOrZone] = useState(
    () => initialData?.outletOrZone ?? "Ocean Breeze Restaurant",
  );
  const [qrPayloadUrl, setQrPayloadUrl] = useState(() => {
    if (initialData?.qrPayloadUrl) return initialData.qrPayloadUrl;
    return `${defaultBaseUrl.replace(/\/+$/, "")}/loc-${Date.now().toString(16)}`;
  });
  const [isActive, setIsActive] = useState(() => initialData?.isActive ?? true);
  const [orderingEnabled, setOrderingEnabled] = useState(
    () => initialData?.orderingEnabled ?? true,
  );
  const [serviceCallingEnabled, setServiceCallingEnabled] = useState(
    () => initialData?.serviceCallingEnabled ?? true,
  );
  const [notes, setNotes] = useState(() => initialData?.notes ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = buildLocationCandidate(
      initialData?.id,
      label,
      locationType,
      outletOrZone,
      qrPayloadUrl,
      isActive,
      orderingEnabled,
      serviceCallingEnabled,
      notes,
    );

    const validation = validateQrLocation(candidate, existingLocations, initialData?.id);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Invalid location configuration.");
      return;
    }

    setValidationError(null);
    onSave(candidate);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit ${initialData.label}` : "Create QR Ordering Location"}
      description="Register restaurant tables, pool loungers, bar counters or in-room tent stands."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 ">
            {validationError}
          </div>
        )}

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Location Category
          </span>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={locationType}
            onChange={(val) => setLocationType(val)}
            fullWidth
            ariaLabel="Location Category"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={labelId} className="block text-xs font-semibold text-slate-700 mb-1">
              Location Label
            </label>
            <input
              id={labelId}
              type="text"
              required
              placeholder="e.g. Table T-05 or Lounger P-03"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor={zoneId} className="block text-xs font-semibold text-slate-700 mb-1">
              Outlet / Service Zone
            </label>
            <input
              id={zoneId}
              type="text"
              required
              placeholder="e.g. Ocean Breeze Restaurant"
              value={outletOrZone}
              onChange={(e) => setOutletOrZone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label htmlFor={urlId} className="block text-xs font-semibold text-slate-700 mb-1">
            Direct QR Payload URL
          </label>
          <input
            id={urlId}
            type="url"
            required
            value={qrPayloadUrl}
            onChange={(e) => setQrPayloadUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 font-mono min-h-[44px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={orderingEnabled}
              onChange={(e) => setOrderingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#0B6E4F]"
            />
            Guest Self-Ordering Enabled
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceCallingEnabled}
              onChange={(e) => setServiceCallingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#0B6E4F]"
            />
            Waiter Calling Bell Active
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#0B6E4F]"
            />
            Location Active
          </label>
        </div>

        <div>
          <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
            Internal Placement Notes
          </label>
          <input
            id={notesId}
            type="text"
            placeholder="e.g. Under palm tree 3, near pool bar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 "
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Save Location
          </button>
        </div>
      </form>
    </DialogModal>
  );
}

// ============================================================================
// Subcomponent: Bulk Create Locations Modal
// ============================================================================

interface BulkLocationsModalProps {
  readonly isOpen: boolean;
  readonly defaultBaseUrl: string;
  readonly onClose: () => void;
  readonly onBulkCreate: (locations: ReadonlyArray<QrLocation>) => void;
}

function BulkLocationsModal({
  isOpen,
  defaultBaseUrl,
  onClose,
  onBulkCreate,
}: BulkLocationsModalProps) {
  const prefixId = useId();
  const startId = useId();
  const endId = useId();
  const zoneId = useId();

  const [prefix, setPrefix] = useState("Table T-");
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(10);
  const [locationType, setLocationType] = useState<QrLocationType>("RESTAURANT_TABLE");
  const [outletOrZone, setOutletOrZone] = useState("Ocean Breeze Restaurant");
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [serviceCallingEnabled, setServiceCallingEnabled] = useState(true);

  const previewCount = Math.max(0, Math.abs(endNumber - startNumber) + 1);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const generated = generateBulkQrLocations({
      prefix,
      startNumber,
      endNumber,
      locationType,
      outletOrZone,
      baseUrl: defaultBaseUrl,
      orderingEnabled,
      serviceCallingEnabled,
    });
    onBulkCreate(generated);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Create QR Ordering Locations"
      description="Quickly generate a batch of restaurant tables, sunbed loungers, or bar spots with unique QR codes."
      size="md"
    >
      <form onSubmit={handleGenerate} className="space-y-4 pt-2">
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Location Type</span>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={locationType}
            onChange={(val) => setLocationType(val)}
            fullWidth
            ariaLabel="Bulk Location Type"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor={prefixId} className="block text-xs font-semibold text-slate-700 mb-1">
              Label Prefix
            </label>
            <input
              id={prefixId}
              type="text"
              required
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. Table T-"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor={startId} className="block text-xs font-semibold text-slate-700 mb-1">
              Start #
            </label>
            <input
              id={startId}
              type="number"
              required
              value={startNumber}
              onChange={(e) => setStartNumber(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm min-h-[44px] tabular-nums-lkr"
            />
          </div>

          <div>
            <label htmlFor={endId} className="block text-xs font-semibold text-slate-700 mb-1">
              End #
            </label>
            <input
              id={endId}
              type="number"
              required
              value={endNumber}
              onChange={(e) => setEndNumber(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm min-h-[44px] tabular-nums-lkr"
            />
          </div>
        </div>

        <div>
          <label htmlFor={zoneId} className="block text-xs font-semibold text-slate-700 mb-1">
            Outlet / Service Zone
          </label>
          <input
            id={zoneId}
            type="text"
            required
            value={outletOrZone}
            onChange={(e) => setOutletOrZone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={orderingEnabled}
              onChange={(e) => setOrderingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#0B6E4F]"
            />
            Guest Self-Ordering Enabled
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceCallingEnabled}
              onChange={(e) => setServiceCallingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#0B6E4F]"
            />
            Waiter Calling Bell
          </label>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 ">
          Will generate{" "}
          <strong className="text-[#0B6E4F] tabular-nums-lkr font-bold">
            {previewCount} locations
          </strong>{" "}
          ({prefix}01 to {prefix}
          {endNumber < 10 ? `0${endNumber}` : endNumber}) in {outletOrZone}.
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Generate {previewCount} Locations
          </button>
        </div>
      </form>
    </DialogModal>
  );
}

// ============================================================================
// Main Component: QrLocationManager
// ============================================================================

export function QrLocationManager({
  initialLocations,
  hotelBaseUrl = "https://stay.resort.lk/qr/demo",
  onSaveLocations,
  isSaving = false,
  readOnly = false,
}: QrLocationManagerProps) {
  const [locations, setLocations] = useState<ReadonlyArray<QrLocation>>(
    () => initialLocations ?? DEFAULT_QR_LOCATIONS,
  );
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTarget, setPreviewTarget] = useState<QrLocation | null>(null);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<QrLocation | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Statistics
  const totalCount = locations.length;
  const tableCount = locations.filter((l) => l.locationType === "RESTAURANT_TABLE").length;
  const poolCount = locations.filter((l) => l.locationType === "POOL_LOUNGER").length;
  const barCount = locations.filter((l) => l.locationType === "LOBBY_COUNTER").length;
  const roomCount = locations.filter((l) => l.locationType === "IN_ROOM").length;

  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      const matchesType = filterType === "ALL" || l.locationType === filterType;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        l.label.toLowerCase().includes(q) ||
        l.outletOrZone.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [locations, filterType, searchQuery]);

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setIsSingleModalOpen(true);
  };

  const handleOpenEdit = (loc: QrLocation) => {
    setEditingLocation(loc);
    setIsSingleModalOpen(true);
  };

  const handleSaveLocation = (saved: QrLocation) => {
    setLocations((prev) => {
      const exists = prev.some((l) => l.id === saved.id);
      if (exists) {
        return prev.map((l) => (l.id === saved.id ? saved : l));
      }
      return [...prev, saved];
    });
  };

  const handleBulkCreate = (newLocs: ReadonlyArray<QrLocation>) => {
    setLocations((prev) => {
      const existingMap = new Set(prev.map((l) => l.label.toLowerCase()));
      const filtered = newLocs.filter((l) => !existingMap.has(l.label.toLowerCase()));
      return [...prev, ...filtered];
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== locationId));
  };

  const handleToggleActive = (locationId: string) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === locationId ? { ...l, isActive: !l.isActive } : l)),
    );
  };

  const handleToggleOrdering = (locationId: string) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === locationId ? { ...l, orderingEnabled: !l.orderingEnabled } : l)),
    );
  };

  const handleSaveAll = async () => {
    setSaveSuccess(false);
    if (onSaveLocations) {
      await onSaveLocations(locations);
      setSaveSuccess(true);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
            Restaurant Tables, Pool Loungers &amp; Cabana QR Locations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified QR ordering registry managing restaurant dining tables, pool deck loungers,
            beach cabanas, and bar counters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 ">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Locations Saved
            </span>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                + Bulk Generate
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[44px] px-4 rounded-xl bg-[#0B6E4F]/10 text-[#0B6E4F] text-xs font-semibold hover:bg-[#0B6E4F]/20 transition-colors cursor-pointer"
              >
                + Add Location
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="min-h-[44px] px-5 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? "Saving..." : "Save Locations"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            Total QR Codes
          </span>
          <span className="text-xl font-bold text-slate-900 tabular-nums-lkr">{totalCount}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">
            Restaurant Tables
          </span>
          <span className="text-xl font-bold text-amber-600 tabular-nums-lkr">{tableCount}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">
            Pool Loungers
          </span>
          <span className="text-xl font-bold text-emerald-600 tabular-nums-lkr">{poolCount}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Bar &amp; Lounge
          </span>
          <span className="text-xl font-bold text-indigo-600 tabular-nums-lkr">{barCount}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">
            In-Room Stands
          </span>
          <span className="text-xl font-bold text-blue-600 tabular-nums-lkr">{roomCount}</span>
        </GlassCard>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search location label, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[40px]"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterType === "ALL"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
            }`}
          >
            All ({locations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("RESTAURANT_TABLE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterType === "RESTAURANT_TABLE"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
            }`}
          >
            Tables ({tableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("POOL_LOUNGER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterType === "POOL_LOUNGER"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
            }`}
          >
            Loungers ({poolCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("LOBBY_COUNTER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterType === "LOBBY_COUNTER"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
            }`}
          >
            Bar/Lobby ({barCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("IN_ROOM")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterType === "IN_ROOM"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/60 "
            }`}
          >
            Rooms ({roomCount})
          </button>
        </div>
      </div>

      {/* Location Grid */}
      {filteredLocations.length === 0 ? (
        <GlassCard material="regular" radius="lg" className="p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 ">
            No locations match your filter criteria.
          </p>
          <p className="text-xs text-slate-500 ">
            Try adjusting your search query or selected category.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredLocations.map((loc) => (
            <QrLocationCard
              key={loc.id}
              location={loc}
              onPreviewQr={(target) => setPreviewTarget(target)}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteLocation}
              onToggleActive={handleToggleActive}
              onToggleOrdering={handleToggleOrdering}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* QR Code Preview Modal */}
      <QrPreviewModal location={previewTarget} onClose={() => setPreviewTarget(null)} />

      {/* Single Location Edit / Add Modal */}
      {isSingleModalOpen && (
        <SingleLocationModal
          isOpen={isSingleModalOpen}
          initialData={editingLocation}
          existingLocations={locations}
          defaultBaseUrl={hotelBaseUrl}
          onClose={() => setIsSingleModalOpen(false)}
          onSave={handleSaveLocation}
        />
      )}

      {/* Bulk Create Locations Modal */}
      {isBulkModalOpen && (
        <BulkLocationsModal
          isOpen={isBulkModalOpen}
          defaultBaseUrl={hotelBaseUrl}
          onClose={() => setIsBulkModalOpen(false)}
          onBulkCreate={handleBulkCreate}
        />
      )}
    </div>
  );
}
