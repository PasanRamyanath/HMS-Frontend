import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type CommandCategory = "rooms" | "reservations" | "orders" | "folios" | "admin" | "actions";

export interface CommandItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly category: CommandCategory;
  readonly keywords?: readonly string[] | undefined;
  readonly badge?: string | undefined;
  readonly shortcut?: string | undefined;
  readonly action?: (() => void) | undefined;
  readonly url?: string | undefined;
}

export interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly items?: readonly CommandItem[] | undefined;
  readonly onSelect?: ((item: CommandItem) => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly enableGlobalShortcut?: boolean | undefined;
  readonly className?: string | undefined;
}

export const DEFAULT_COMMAND_ITEMS: readonly CommandItem[] = [
  // Rooms & Suites
  {
    id: "room-101",
    title: "Room 101 — Deluxe Ocean Suite",
    subtitle: "Ground Floor · King Bed · Vacant Clean",
    category: "rooms",
    keywords: ["101", "deluxe", "ocean", "ground", "vacant", "clean"],
    badge: "VACANT",
  },
  {
    id: "room-102",
    title: "Room 102 — Superior Garden Villa",
    subtitle: "East Wing · King Bed · Vacant Inspected",
    category: "rooms",
    keywords: ["102", "superior", "garden", "villa", "east", "inspected"],
    badge: "INSPECTED",
  },
  {
    id: "room-104",
    title: "Room 104 — Presidential Pool Villa",
    subtitle: "Beachfront · Guest: K. Perera · Folio #FL-402",
    category: "rooms",
    keywords: ["104", "presidential", "pool", "perera", "beachfront", "occupied"],
    badge: "OCCUPIED",
  },
  {
    id: "room-201",
    title: "Room 201 — Executive Twin Suite",
    subtitle: "Upper Level · 2 Queen Beds · Stayover Dirty",
    category: "rooms",
    keywords: ["201", "executive", "twin", "upper", "stayover", "dirty"],
    badge: "DIRTY",
  },

  // Active Reservations
  {
    id: "res-8921",
    title: "RES-8921 — Kasun Perera",
    subtitle: "Room 104 · 3 Nights · Direct Booking · LKR 145,000",
    category: "reservations",
    keywords: ["8921", "kasun", "perera", "104", "direct", "checked-in"],
    badge: "CHECKED IN",
  },
  {
    id: "res-8945",
    title: "RES-8945 — Sophie Laurent",
    subtitle: "Room 102 · 4 Nights · Booking.com OTA · Arriving 14:00",
    category: "reservations",
    keywords: ["8945", "sophie", "laurent", "102", "booking.com", "arrival"],
    badge: "DUE IN",
  },

  // Active Orders & KDS
  {
    id: "order-1021",
    title: "Order #1021 — Room 104 (Pool Villa)",
    subtitle: "Seafood Kottu x2, King Coconut x2 · Prep Time 18 min",
    category: "orders",
    keywords: ["1021", "kottu", "seafood", "coconut", "kds", "room 104"],
    badge: "PREPARING",
  },
  {
    id: "order-1024",
    title: "Order #1024 — Table 6 (Ocean Terrace)",
    subtitle: "Devilled Prawns, Lion Lager x3, Pol Roti · Ready for Dispatch",
    category: "orders",
    keywords: ["1024", "table 6", "prawns", "lion", "lager", "roti", "ocean terrace"],
    badge: "READY",
  },

  // Folios & Sri Lankan Billing
  {
    id: "folio-402",
    title: "Folio #FL-402 — Room 104 (Kasun Perera)",
    subtitle: "Subtotal: LKR 120,000 · 10% SC + 1% TDL + 2.56% SSCL + 18% VAT",
    category: "folios",
    keywords: ["fl-402", "folio", "104", "perera", "tax", "settle", "lkr"],
    badge: "LKR 161,280",
    shortcut: "⌘F",
  },
  {
    id: "folio-settle-qr",
    title: "LankaQR Front Desk Dynamic Checkout",
    subtitle: "Generate EMVCo dynamic QR code for instant LKR settlement",
    category: "folios",
    keywords: ["lankaqr", "emvco", "settle", "qr", "ceft", "instant", "cbsl"],
    badge: "LANKAQR",
  },

  // Operations & Admin Modules
  {
    id: "mod-tapechart",
    title: "Tape Chart & Room Grid",
    subtitle: "Visual room rack, calendar timeline & unassigned allocations",
    category: "admin",
    keywords: ["tape", "chart", "grid", "rack", "calendar", "timeline", "rooms"],
    shortcut: "⌘1",
    url: "/admin/tape-chart",
  },
  {
    id: "mod-frontdesk",
    title: "Front Desk & Check-In Wizard",
    subtitle: "NIC / Passport verification, SLTDA arrival record & key issuing",
    category: "admin",
    keywords: ["frontdesk", "checkin", "guest", "registration", "passport", "nic"],
    shortcut: "⌘2",
    url: "/admin/front-desk",
  },
  {
    id: "mod-kds",
    title: "Kitchen KDS Live Order Board",
    subtitle: "Color-coded prep timer, course bumping & Sri Lankan spice tags",
    category: "admin",
    keywords: ["kds", "kitchen", "prep", "chef", "cook", "tickets"],
    shortcut: "⌘3",
    url: "/admin/kds",
  },
  {
    id: "mod-housekeeping",
    title: "Housekeeping Floor Runner",
    subtitle: "Attendant task sheets, turnaround tracking & linen breakage log",
    category: "admin",
    keywords: ["housekeeping", "runner", "linen", "turnaround", "dirty", "inspected"],
    shortcut: "⌘4",
    url: "/admin/housekeeping",
  },
  {
    id: "mod-nightaudit",
    title: "Night Audit & IRD Tax Closing",
    subtitle: "Automated room posting, 4-stage tax rollup & trial balance closure",
    category: "admin",
    keywords: ["night", "audit", "tax", "ird", "closing", "eod", "balance"],
    shortcut: "⌘5",
    url: "/admin/night-audit",
  },
  {
    id: "mod-settings",
    title: "Hotel Settings & Property Profile",
    subtitle: "Branding, SLTDA license, LankaQR merchant codes & notification masks",
    category: "admin",
    keywords: ["settings", "profile", "branding", "logo", "taxes", "lankaqr", "sms"],
    shortcut: "⌘,",
    url: "/admin/settings",
  },
  {
    id: "mod-menus",
    title: "Menu & Dish Catalog",
    subtitle: "Dishes, dietary tags, multi-category items & printable menus",
    category: "admin",
    keywords: ["menu", "food", "dishes", "catalog", "beverage", "print"],
    url: "/admin/menus",
  },
  {
    id: "mod-rooms",
    title: "Room Inventory & Rates",
    subtitle: "Room types, LKR/USD tariffs, child policies & seasonal bands",
    category: "admin",
    keywords: ["rooms", "inventory", "rates", "tariffs", "villas", "suites"],
    url: "/admin/rooms",
  },
  {
    id: "mod-superadmin",
    title: "SaaS Super-Admin & Chain Directory",
    subtitle: "Multi-tenant properties, AWS free-tier quota & backup manager",
    category: "admin",
    keywords: ["saas", "superadmin", "multi-tenant", "quota", "backup", "chain"],
    shortcut: "⌘6",
    url: "/admin/super-admin",
  },

  // Quick Actions
  {
    id: "action-new-booking",
    title: "Create New Walk-In / Reservation",
    subtitle: "Quick booking drawer with real-time rate calculator",
    category: "actions",
    keywords: ["new", "booking", "walkin", "reserve", "create"],
    shortcut: "⌘N",
  },
  {
    id: "action-guest-qr",
    title: "View Guest Contactless QR Menu",
    subtitle: "Instant preview of room service PWA in room 104",
    category: "actions",
    keywords: ["guest", "qr", "menu", "ordering", "pwa", "mobile"],
    shortcut: "⌘Q",
  },
  {
    id: "action-switch-property",
    title: "Switch Hotel Property",
    subtitle: "Jump between Galle Fort Villa, Kandy Hills, & Bentota Beach",
    category: "actions",
    keywords: ["switch", "property", "hotel", "resort", "galle", "kandy", "bentota"],
    shortcut: "⌘P",
  },
];

export function getCategoryLabel(category: CommandCategory): string {
  switch (category) {
    case "rooms":
      return "Rooms & Suites";
    case "reservations":
      return "Reservations";
    case "orders":
      return "Active Orders & KDS";
    case "folios":
      return "Folios & Billing";
    case "admin":
      return "Modules & Settings";
    case "actions":
      return "Quick Actions";
    default:
      return "Other";
  }
}

export function getCategoryBadgeClass(category: CommandCategory): string {
  switch (category) {
    case "rooms":
      return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20";
    case "reservations":
      return "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20";
    case "orders":
      return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20";
    case "folios":
      return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20";
    case "admin":
      return "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20";
    case "actions":
      return "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20";
  }
}

function matchesItem(item: CommandItem, term: string): boolean {
  if (item.title.toLowerCase().includes(term)) return true;
  if (item.subtitle?.toLowerCase().includes(term)) return true;
  if (item.category.toLowerCase().includes(term)) return true;
  if (item.badge?.toLowerCase().includes(term)) return true;
  if (item.keywords?.some((k) => k.toLowerCase().includes(term))) {
    return true;
  }
  return false;
}

export function filterCommandItems(
  items: readonly CommandItem[],
  query: string,
): readonly CommandItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return items;
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);
  return items.filter((item) => terms.every((term) => matchesItem(item, term)));
}

export function groupCommandItemsByCategory(
  items: readonly CommandItem[],
): Record<CommandCategory, CommandItem[]> {
  const grouped: Record<CommandCategory, CommandItem[]> = {
    rooms: [],
    reservations: [],
    orders: [],
    folios: [],
    admin: [],
    actions: [],
  };

  for (const item of items) {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    }
  }

  return grouped;
}

function syncDialogModal(dialog: HTMLDialogElement | null, isOpen: boolean): void {
  if (!dialog) return;
  if (isOpen && typeof dialog.showModal === "function" && !dialog.open) {
    dialog.showModal();
  } else if (!isOpen && typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  }
}

interface CommandListItemProps {
  readonly item: CommandItem;
  readonly isSelected: boolean;
  readonly onSelect: (item: CommandItem) => void;
  readonly onMouseEnter: () => void;
}

function CommandListItem({ item, isSelected, onSelect, onMouseEnter }: CommandListItemProps) {
  const badgeClass = getCategoryBadgeClass(item.category);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        onMouseEnter={onMouseEnter}
        className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl min-h-[44px] cursor-pointer transition-all duration-150 select-none ${
          isSelected
            ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
            : "hover:bg-slate-100/70 dark:hover:bg-white/5 text-slate-900 dark:text-white"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-3">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
              isSelected ? "bg-white/20 text-white border-white/30" : badgeClass
            }`}
          >
            {item.category}
          </span>

          <div className="flex flex-col min-w-0">
            <span
              className={`text-sm font-semibold truncate ${
                isSelected ? "text-white" : "text-slate-900 dark:text-white"
              }`}
            >
              {item.title}
            </span>
            {item.subtitle && (
              <span
                className={`text-xs truncate ${
                  isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.badge && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums-lkr ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {item.badge}
            </span>
          )}

          {item.shortcut && (
            <kbd
              className={`hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded ${
                isSelected
                  ? "bg-white/25 text-white"
                  : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {item.shortcut}
            </kbd>
          )}
        </div>
      </button>
    </li>
  );
}

function CommandEmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        No matching hotel entities or commands
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Try searching for room number "104", order "#1021", "Folio", or "Night Audit"
      </p>
    </div>
  );
}

function CommandPaletteFooter({ resultCount }: { readonly resultCount: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200/60 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            ↑
          </kbd>
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            ↓
          </kbd>
          <span className="text-[11px]">Navigate</span>
        </span>

        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            ↵
          </kbd>
          <span className="text-[11px]">Select</span>
        </span>

        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            ESC
          </kbd>
          <span className="text-[11px]">Close</span>
        </span>
      </div>

      <div className="tabular-nums-lkr text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </div>
    </div>
  );
}

export function CommandPalette({
  isOpen,
  onClose,
  items = DEFAULT_COMMAND_ITEMS,
  onSelect,
  placeholder = "Search rooms, folios, KDS tickets, or modules (e.g. 104, #1021)...",
  enableGlobalShortcut = false,
  className = "",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchInputId = useId();

  const filteredItems = useMemo(() => filterCommandItems(items, query), [items, query]);

  // Sync dialog open/close state
  useEffect(() => {
    syncDialogModal(dialogRef.current, isOpen);
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Optional global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    if (!enableGlobalShortcut) return;

    const handleGlobalKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          syncDialogModal(dialogRef.current, true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [enableGlobalShortcut, isOpen, onClose]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleSelectItem = (item: CommandItem) => {
    if (item.action) {
      item.action();
    }
    if (onSelect) {
      onSelect(item);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleSelectItem(current);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      aria-label="Spotlight Command Palette"
      className={`fixed inset-0 m-auto p-0 bg-transparent backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm z-50 w-full max-w-2xl border-0 overflow-visible focus:outline-none ${className}`.trim()}
    >
      <div className="apple-liquid-glass rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh] transition-all duration-200">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-slate-900/50">
          <svg
            className="w-5 h-5 text-slate-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            ref={inputRef}
            id={searchInputId}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none tracking-tight font-medium"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              aria-label="Clear search input"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-md transition-colors"
            >
              Clear
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-white/5">
          {filteredItems.length === 0 ? (
            <CommandEmptyState />
          ) : (
            <ul className="space-y-1">
              {filteredItems.map((item, index) => (
                <CommandListItem
                  key={item.id}
                  item={item}
                  isSelected={index === selectedIndex}
                  onSelect={handleSelectItem}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Apple HIG Spotlight Footer with Keyboard Hints */}
        <CommandPaletteFooter resultCount={filteredItems.length} />
      </div>
    </dialog>
  );
}
