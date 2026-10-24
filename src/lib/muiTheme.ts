/**
 * MUI v6 / Material Design 3 Enterprise Design Tokens (`src/lib/muiTheme.ts`).
 * Provides the warm alabaster canvas (#F4F7F5), crisp white surface cards (#FFFFFF),
 * deep botanical forest emerald primary (#0B6E4F), and responsive breakpoints.
 */

export const MUI_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const HMS_MUI_THEME = {
  palette: {
    mode: "light",
    primary: {
      main: "#0B6E4F",
      dark: "#095C42",
      light: "#ECFDF5",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#D97706",
      light: "#FEF3C7",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F4F7F5",
      paper: "#FFFFFF",
      subtle: "#F8FAFC",
    },
    divider: "#E2E8F0",
    text: {
      primary: "#0F172A",
      secondary: "#475569",
      disabled: "#94A3B8",
    },
    status: {
      successBg: "#ECFDF5",
      successText: "#065F46",
      warningBg: "#FFFBEB",
      warningText: "#B45309",
      errorBg: "#FEF2F2",
      errorText: "#B91C1C",
      infoBg: "#EFF6FF",
      infoText: "#1D4ED8",
    },
  },
  shape: {
    borderRadius: 12,
    cardBorderRadius: 14,
  },
  typography: {
    fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilySerif: "'Playfair Display', Georgia, serif",
    fontFamilyMono: "'JetBrains Mono', monospace",
  },
} as const;
