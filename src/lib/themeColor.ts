/**
 * Dynamic Brand Theme Color Management for Sri Lanka HMS.
 *
 * Provides real-time reactive theme color switching, persistent localStorage storage,
 * and automatic derivation of light/dark CSS variables for primary, hover, surface,
 * border, ring, and high-contrast text tokens.
 */

export interface ThemePalettePreset {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly hex: string;
  readonly emoji: string;
  readonly category: "Botanical" | "Coastal" | "Heritage" | "Executive" | "Warmth";
}

export const DEFAULT_THEME_COLOR = "#0D7450"; // Ceylon Botanical Emerald (UX-UI v1/v2 default)

export const PRESET_THEME_PALETTES: ReadonlyArray<ThemePalettePreset> = [
  {
    id: "ceylon-emerald",
    name: "Ceylon Emerald",
    subtitle: "Botanical rainforest & tea estate luxury",
    hex: "#0D7450",
    emoji: "Eco",
    category: "Botanical",
  },
  {
    id: "ocean-sapphire",
    name: "Ocean Sapphire",
    subtitle: "Galle Fort maritime & southern coastline",
    hex: "#0284C7",
    emoji: "Wave",
    category: "Coastal",
  },
  {
    id: "sunset-coral",
    name: "Sunset Coral",
    subtitle: "Bentota & Mirissa golden hour warmth",
    hex: "#E8772E",
    emoji: "AM",
    category: "Warmth",
  },
  {
    id: "royal-amethyst",
    name: "Royal Amethyst",
    subtitle: "Highland boutique villas & luxury suites",
    hex: "#7C3AED",
    emoji: "Royal",
    category: "Heritage",
  },
  {
    id: "kandyan-gold",
    name: "Kandyan Gold",
    subtitle: "Kingdom of Kandy heritage brass & amber",
    hex: "#D97706",
    emoji: "Heritage",
    category: "Heritage",
  },
  {
    id: "obsidian-slate",
    name: "Obsidian Slate",
    subtitle: "Minimalist executive monochrome",
    hex: "#334155",
    emoji: "⬛",
    category: "Executive",
  },
  {
    id: "cinnamon-ruby",
    name: "Cinnamon Ruby",
    subtitle: "Ceylon spice island deep crimson",
    hex: "#BE123C",
    emoji: "Wine",
    category: "Warmth",
  },
  {
    id: "palm-leaf",
    name: "Palm Leaf",
    subtitle: "Tropical palm grove fresh lime & jade",
    hex: "#15803D",
    emoji: "Palm",
    category: "Botanical",
  },
];

const THEME_STORAGE_KEY = "hms_brand_color";
const THEME_CHANGE_EVENT = "hms:theme-change";
const inMemoryListeners = new Set<(hex: string) => void>();

/**
 * Validates a 3, 6, or 8-digit hexadecimal color string.
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex.trim());
}

/**
 * Parses a hex color string into RGB numerical components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    const ch0 = cleanHex.charAt(0);
    const ch1 = cleanHex.charAt(1);
    const ch2 = cleanHex.charAt(2);
    const r = Number.parseInt(ch0 + ch0, 16);
    const g = Number.parseInt(ch1 + ch1, 16);
    const b = Number.parseInt(ch2 + ch2, 16);
    return { r, g, b };
  }
  if (cleanHex.length === 6 || cleanHex.length === 8) {
    const r = Number.parseInt(cleanHex.substring(0, 2), 16);
    const g = Number.parseInt(cleanHex.substring(2, 4), 16);
    const b = Number.parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Adjusts brightness of a hex color (positive to lighten, negative to darken).
 */
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + percent / 100;
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const r = clamp(rgb.r * factor)
    .toString(16)
    .padStart(2, "0");
  const g = clamp(rgb.g * factor)
    .toString(16)
    .padStart(2, "0");
  const b = clamp(rgb.b * factor)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

/**
 * Computes luminance to determine whether white or dark text offers better contrast.
 */
export function getContrastTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  // W3C formula for relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#0F172A" : "#FFFFFF";
}

/**
 * Retrieves the currently saved theme color, or the default Ceylon Emerald.
 */
export function getStoredThemeColor(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_THEME_COLOR;
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidHexColor(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage quota or access errors
  }
  return DEFAULT_THEME_COLOR;
}

/**
 * Injects dynamic CSS variables on document.documentElement for the given hex color.
 */
export function applyThemeColor(hex: string): void {
  if (!isValidHexColor(hex)) return;

  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const darkPrimary = adjustBrightness(hex, 18);
  const hoverColor = adjustBrightness(hex, -12);
  const darkHoverColor = adjustBrightness(hex, 28);
  const contrastText = getContrastTextColor(hex);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", hex);
    root.style.setProperty("--brand-hover", hoverColor);
    root.style.setProperty("--brand-surface", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
    root.style.setProperty("--brand-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
    root.style.setProperty("--brand-ring", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
    root.style.setProperty("--brand-text", hex);
    root.style.setProperty("--brand-contrast-text", contrastText);

    // Dark mode variant variables
    root.style.setProperty("--brand-dark-primary", darkPrimary);
    root.style.setProperty("--brand-dark-hover", darkHoverColor);
    root.style.setProperty("--brand-dark-surface", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
    root.style.setProperty("--brand-dark-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);

    // Update browser theme-color meta tag for PWA/mobile browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", hex);
    }
  }

  for (const listener of inMemoryListeners) {
    try {
      listener(hex);
    } catch {
      // Ignore listener error
    }
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, hex);
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { hex } }));
    } catch {
      // Ignore storage access errors
    }
  }
}

/**
 * Subscribes to runtime theme color changes.
 */
export function subscribeToThemeColor(listener: (hex: string) => void): () => void {
  inMemoryListeners.add(listener);

  let removeWindowListener: (() => void) | undefined;
  if (typeof window !== "undefined") {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ hex: string }>;
      if (customEvent.detail?.hex) {
        listener(customEvent.detail.hex);
      }
    };
    window.addEventListener(THEME_CHANGE_EVENT, handler);
    removeWindowListener = () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handler);
    };
  }

  return () => {
    inMemoryListeners.delete(listener);
    removeWindowListener?.();
  };
}

/**
 * Resets the theme color back to Ceylon Botanical Emerald default.
 */
export function resetThemeColor(): void {
  applyThemeColor(DEFAULT_THEME_COLOR);
}
