/**
 * Apple HIG Multi-Property Hotel Group Switcher Dropdown.
 * Enables hospitality group owners with 2+ properties (e.g. Colombo, Kandy, Bentota)
 * to switch property management context in 1 click without logging out.
 * Implements Apple HIG Liquid Glass translucency, continuous squircle geometry,
 * and tabular numeric typography.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type PropertyTier = "LUXURY_RESORT" | "BOUTIQUE_VILLA" | "CITY_HOTEL" | "REST_HOUSE";
export type PropertyOperationalStatus = "ONLINE" | "BUSY" | "MAINTENANCE" | "OFFLINE";

export interface HotelProperty {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly province: string;
  readonly address: string;
  readonly roomCount: number;
  readonly occupancyRate: number; // 0.0 to 1.0 (e.g. 0.88 = 88%)
  readonly todayRevenueLkr: number;
  readonly tier: PropertyTier;
  readonly status: PropertyOperationalStatus;
}

export interface PropertySwitcherDropdownProps {
  readonly properties?: ReadonlyArray<HotelProperty> | undefined;
  readonly activePropertyId?: string | undefined;
  readonly groupName?: string | undefined;
  readonly onPropertySelect?: ((property: HotelProperty) => void) | undefined;
  readonly onViewConsolidatedGroup?: (() => void) | undefined;
  readonly onAddNewProperty?: (() => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

export const DEFAULT_HOTEL_GROUP_PROPERTIES: ReadonlyArray<HotelProperty> = [
  {
    id: "tenant-colombo",
    name: "Cinnamon Grand Horizon Colombo",
    city: "Colombo",
    province: "Western Province",
    address: "Galle Face Centre Road, Colombo 03",
    roomCount: 120,
    occupancyRate: 0.88,
    todayRevenueLkr: 1840000,
    tier: "CITY_HOTEL",
    status: "ONLINE",
  },
  {
    id: "tenant-kandy",
    name: "Kandy Hills Sanctuary & Tea Estate",
    city: "Kandy",
    province: "Central Province",
    address: "Heerassagala Road, Kandy",
    roomCount: 45,
    occupancyRate: 0.94,
    todayRevenueLkr: 720000,
    tier: "BOUTIQUE_VILLA",
    status: "ONLINE",
  },
  {
    id: "tenant-bentota",
    name: "Bentota Coral Palms Oceanfront Resort",
    city: "Bentota",
    province: "Southern Province",
    address: "Galle Road, Bentota",
    roomCount: 60,
    occupancyRate: 0.76,
    todayRevenueLkr: 1150000,
    tier: "LUXURY_RESORT",
    status: "ONLINE",
  },
];

export function formatCurrencyLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function getTierBadgeLabel(tier: PropertyTier): string {
  switch (tier) {
    case "LUXURY_RESORT":
      return "Resort";
    case "BOUTIQUE_VILLA":
      return "Villa";
    case "CITY_HOTEL":
      return "City Hotel";
    case "REST_HOUSE":
      return "Rest House";
  }
}

interface TriggerButtonProps {
  readonly activeProperty: HotelProperty | undefined;
  readonly isOpen: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly panelId: string;
}

function TriggerButton({ activeProperty, isOpen, disabled, onClick, panelId }: TriggerButtonProps) {
  return (
    <button
      type="button"
      id="property-switcher-trigger"
      aria-expanded={isOpen}
      aria-controls={panelId}
      aria-label="Switch hotel property"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[44px] min-w-[200px] max-w-xs px-3.5 py-2 rounded-2xl apple-liquid-glass border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 text-left transition-all duration-200 ease-apple-spring hover:border-apple-blue/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        isOpen ? "ring-2 ring-apple-blue border-transparent" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500 animate-pulse"
          aria-hidden="true"
        />
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {activeProperty?.name ?? "Select Property"}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            <span>{activeProperty?.city ?? "Sri Lanka"}</span>
            <span aria-hidden="true">•</span>
            <span className="tabular-nums-lkr font-medium text-apple-blue">
              {activeProperty ? formatPercent(activeProperty.occupancyRate) : "--"} Occ
            </span>
          </span>
        </div>
      </div>

      <svg
        className={`w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-200 ease-apple-spring ${
          isOpen ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

interface GroupHeaderProps {
  readonly groupName: string;
  readonly totalRooms: number;
  readonly averageOccupancy: number;
  readonly totalRevenueLkr: number;
  readonly propertyCount: number;
}

function GroupHeader({
  groupName,
  totalRooms,
  averageOccupancy,
  totalRevenueLkr,
  propertyCount,
}: GroupHeaderProps) {
  return (
    <div className="p-3.5 border-b border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Hospitality Chain Group
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20">
          {propertyCount} Properties
        </span>
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{groupName}</h4>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/40 dark:border-white/5">
        <div>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase">
            Total Rooms
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums-lkr">
            {totalRooms}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase">
            Avg Occ
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
            {formatPercent(averageOccupancy)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase">
            Today Rev
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums-lkr truncate block">
            {formatCurrencyLkr(totalRevenueLkr)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PropertyItemProps {
  readonly property: HotelProperty;
  readonly isSelected: boolean;
  readonly isFocused: boolean;
  readonly onSelect: (property: HotelProperty) => void;
}

function PropertyItem({ property, isSelected, isFocused, onSelect }: PropertyItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(property)}
      className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 text-left ${
        isSelected
          ? "bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue font-medium"
          : isFocused
            ? "bg-slate-100 dark:bg-white/10"
            : "hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {property.name}
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
            {getTierBadgeLabel(property.tier)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{property.city}</span>
          <span aria-hidden="true">•</span>
          <span className="tabular-nums-lkr">{property.roomCount} rooms</span>
          <span aria-hidden="true">•</span>
          <span className="tabular-nums-lkr font-medium text-emerald-600 dark:text-emerald-400">
            {formatPercent(property.occupancyRate)} occ
          </span>
          <span aria-hidden="true">•</span>
          <span className="tabular-nums-lkr text-slate-600 dark:text-slate-300 font-medium">
            {formatCurrencyLkr(property.todayRevenueLkr)}
          </span>
        </div>
      </div>

      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-apple-blue text-white flex items-center justify-center shrink-0">
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
        </div>
      )}
    </button>
  );
}

interface DropdownFooterProps {
  readonly onViewConsolidatedGroup?: (() => void) | undefined;
  readonly onAddNewProperty?: (() => void) | undefined;
}

function DropdownFooter({ onViewConsolidatedGroup, onAddNewProperty }: DropdownFooterProps) {
  return (
    <div className="p-2 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onViewConsolidatedGroup}
        className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold text-apple-blue hover:bg-apple-blue/10 transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span>Consolidated Group View</span>
      </button>

      {onAddNewProperty && (
        <button
          type="button"
          onClick={onAddNewProperty}
          className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Hotel</span>
        </button>
      )}
    </div>
  );
}

function processMenuNavigationKey(
  key: string,
  itemCount: number,
  onClose: () => void,
  onAdvance: () => void,
  onPrevious: () => void,
  onConfirm: () => void,
): boolean {
  if (key === "Escape") {
    onClose();
    return true;
  }
  if (key === "ArrowDown") {
    onAdvance();
    return true;
  }
  if (key === "ArrowUp") {
    onPrevious();
    return true;
  }
  if (key === "Enter" && itemCount > 0) {
    onConfirm();
    return true;
  }
  return false;
}

export function PropertySwitcherDropdown({
  properties = DEFAULT_HOTEL_GROUP_PROPERTIES,
  activePropertyId,
  groupName = "Ceylon Heritage Hospitality Group",
  onPropertySelect,
  onViewConsolidatedGroup,
  onAddNewProperty,
  disabled = false,
  className = "",
}: PropertySwitcherDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const activeProperty = useMemo(() => {
    if (activePropertyId) {
      const match = properties.find((p) => p.id === activePropertyId);
      if (match) return match;
    }
    return properties[0];
  }, [properties, activePropertyId]);

  const groupMetrics = useMemo(() => {
    const totalRooms = properties.reduce((acc, p) => acc + p.roomCount, 0);
    const totalRevenueLkr = properties.reduce((acc, p) => acc + p.todayRevenueLkr, 0);
    const weightedOcc =
      totalRooms > 0
        ? properties.reduce((acc, p) => acc + p.occupancyRate * p.roomCount, 0) / totalRooms
        : 0;
    return {
      totalRooms,
      totalRevenueLkr,
      averageOccupancy: weightedOcc,
    };
  }, [properties]);

  const handleSelect = useCallback(
    (property: HotelProperty) => {
      setIsOpen(false);
      if (onPropertySelect) {
        onPropertySelect(property);
      }
    },
    [onPropertySelect],
  );

  // Keyboard navigation & outside click dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const handled = processMenuNavigationKey(
        event.key,
        properties.length,
        () => setIsOpen(false),
        () => setFocusedIndex((prev) => (prev + 1) % properties.length),
        () => setFocusedIndex((prev) => (prev - 1 + properties.length) % properties.length),
        () => {
          const selected = properties[focusedIndex];
          if (selected) handleSelect(selected);
        },
      );
      if (handled && event.key !== "Escape") {
        event.preventDefault();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, focusedIndex, properties, handleSelect]);

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <TriggerButton
        activeProperty={activeProperty}
        isOpen={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        panelId={panelId}
      />

      {isOpen && (
        <div
          id={panelId}
          aria-label="Available hotel properties"
          className="absolute left-0 mt-2 w-96 rounded-2xl apple-liquid-glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl z-50 overflow-hidden transition-all duration-200 ease-apple-spring animate-in fade-in zoom-in-95"
        >
          <GroupHeader
            groupName={groupName}
            totalRooms={groupMetrics.totalRooms}
            averageOccupancy={groupMetrics.averageOccupancy}
            totalRevenueLkr={groupMetrics.totalRevenueLkr}
            propertyCount={properties.length}
          />

          <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
            {properties.map((property, idx) => (
              <PropertyItem
                key={property.id}
                property={property}
                isSelected={property.id === activeProperty?.id}
                isFocused={idx === focusedIndex}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <DropdownFooter
            onViewConsolidatedGroup={() => {
              setIsOpen(false);
              if (onViewConsolidatedGroup) onViewConsolidatedGroup();
            }}
            onAddNewProperty={
              onAddNewProperty
                ? () => {
                    setIsOpen(false);
                    onAddNewProperty();
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
