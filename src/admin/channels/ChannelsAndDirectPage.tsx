import { useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import { generateQrSvg } from "../../lib/qrSvg.js";
import { BankPromoManager } from "./BankPromoManager.js";
import { ChannelManagerView } from "./ChannelManagerView.js";
import { OtaCommissionTable } from "./OtaCommissionTable.js";
import { QuickRestrictionsBar } from "./QuickRestrictionsBar.js";
import { WebhookLogDrawer } from "./WebhookLogDrawer.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ChannelsPageTab =
  | "CHANNELS_ARI"
  | "RESTRICTIONS"
  | "COMMISSIONS"
  | "BANK_PROMOS"
  | "DIRECT_WIDGET";

export interface ChannelsAndDirectPageProps {
  readonly tenantId?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly initialTab?: ChannelsPageTab | undefined;
  readonly onTabChange?: ((tab: ChannelsPageTab) => void) | undefined;
  readonly className?: string | undefined;
}

export interface DirectWidgetConfig {
  readonly layout: "floating" | "inline";
  readonly theme: "apple-glass" | "emerald" | "navy" | "amber";
  readonly showPromos: boolean;
  readonly primaryColor: string;
}

// ============================================================================
// Default Constants & Navigation Options
// ============================================================================

export const DEFAULT_TENANT_ID = "tenant-galle-fort";
export const DEFAULT_HOTEL_NAME = "Galle Fort Lighthouse Villa";

export const CHANNELS_PAGE_TABS: ReadonlyArray<SegmentedControlOption<ChannelsPageTab>> = [
  { id: "CHANNELS_ARI", label: "OTAs & Channex ARI" },
  { id: "RESTRICTIONS", label: "Stop-Sell & MinLOS" },
  { id: "COMMISSIONS", label: "OTA Reconciliation" },
  { id: "BANK_PROMOS", label: "Bank Card Promos" },
  { id: "DIRECT_WIDGET", label: "Direct Engine & Embed" },
];

export const WIDGET_THEMES: ReadonlyArray<{ readonly id: string; readonly name: string }> = [
  { id: "apple-glass", name: "Apple Liquid Glass" },
  { id: "emerald", name: "Bentota Emerald" },
  { id: "navy", name: "Galle Fort Navy" },
  { id: "amber", name: "Sigiriya Amber" },
];

// ============================================================================
// Pure Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function generateBookingEmbedCode(
  tenantId: string,
  layout: "floating" | "inline" = "floating",
  theme = "apple-glass",
): string {
  const cleanTenant = tenantId.trim() || DEFAULT_TENANT_ID;
  return `<script src="https://cdn.srilankahms.com/booking-widget.js" data-tenant="${cleanTenant}" data-layout="${layout}" data-theme="${theme}" async></script>`;
}

export function computeProjectedDirectSavings(
  directRevenueLkr: number,
  avgOtaCommissionRate = 0.18,
): number {
  if (directRevenueLkr <= 0 || avgOtaCommissionRate <= 0) {
    return 0;
  }
  return Math.round(directRevenueLkr * avgOtaCommissionRate);
}

export function getTabDisplayConfig(tab: ChannelsPageTab): {
  readonly title: string;
  readonly subtitle: string;
} {
  switch (tab) {
    case "CHANNELS_ARI":
      return {
        title: "OTA Distribution & Channex 2-Way ARI Sync",
        subtitle:
          "Manage real-time 2-way room rate, availability, and inventory push to Booking.com, Agoda, and Airbnb.",
      };
    case "RESTRICTIONS":
      return {
        title: "Instant Stop-Sell & MinLOS Quick Toggle Bar",
        subtitle:
          "1-tap emergency Stop-Sell and Minimum Length of Stay rules pushed instantly to OTAs and the Direct Engine.",
      };
    case "COMMISSIONS":
      return {
        title: "OTA Commission & Net Revenue Reconciliation",
        subtitle:
          "Audit monthly OTA invoices against PMS reservation stays and identify direct booking margin savings.",
      };
    case "BANK_PROMOS":
      return {
        title: "Sri Lankan Bank Card Promotions & Coupon Manager",
        subtitle:
          "Configure BIN-based discounts for Sampath, Commercial Bank, HNB, and Amex on the direct booking engine.",
      };
    case "DIRECT_WIDGET":
      return {
        title: "Commission-Free Direct Booking Engine & 1-Line Embed Widget",
        subtitle:
          "Zero-commission booking engine with trilingual checkout, PayHere/WebXPay integration, and website embed codes.",
      };
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

function HeaderKpiBar({
  onOpenWebhooks,
  onOpenPortal,
  portalUrl,
}: {
  readonly onOpenWebhooks: () => void;
  readonly onOpenPortal: () => void;
  readonly portalUrl: string;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-700/50 pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Distribution &amp; Direct Booking Hub
          </h1>
          <StatusBadge
            status="CHANNEX 2-WAY LIVE"
            label="CHANNEX 2-WAY LIVE"
            color="green"
            size="sm"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Unified distribution workspace for 2-way OTA rate parity, local bank card promotions, and
          commission-free direct guest reservations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenWebhooks}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2 transition-colors min-h-[44px]"
        >
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Webhook Inspector</span>
        </button>

        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpenPortal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all min-h-[44px]"
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span>Live Booking Portal</span>
        </a>
      </div>
    </div>
  );
}

function DirectWidgetStudio({
  tenantId,
  hotelName,
}: {
  readonly tenantId: string;
  readonly hotelName: string;
}) {
  const formId = useId();
  const [layout, setLayout] = useState<"floating" | "inline">("floating");
  const [theme, setTheme] = useState<string>("apple-glass");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const directBookingUrl = `https://book.srilankahms.com/book/${tenantId}`;
  const embedCode = generateBookingEmbedCode(tenantId, layout, theme);

  const qrSvg = generateQrSvg(directBookingUrl, {
    size: 240,
    centerBadgeText: "BOOK DIRECT",
    centerBadgeSubtext: "BEST RATE",
  });

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(embedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(directBookingUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const projectedSavings = computeProjectedDirectSavings(8500000, 0.18);

  return (
    <div className="space-y-6">
      {/* 1. Value Proposition Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 rounded-2xl apple-liquid-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            0% Commission Direct
          </span>
          <div className="text-2xl font-bold tabular-nums-lkr text-slate-900 dark:text-white mt-1">
            {formatLkr(projectedSavings)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Estimated monthly OTA commission saved based on LKR 8.5M direct volume.
          </p>
        </GlassCard>

        <GlassCard className="p-5 rounded-2xl apple-liquid-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Hosted Booking Route
          </span>
          <div className="text-xs font-mono text-slate-900 dark:text-white mt-2 truncate">
            {directBookingUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[32px] inline-flex items-center"
          >
            {copiedUrl ? "Copied URL to Clipboard!" : "Copy Direct Link"}
          </button>
        </GlassCard>

        <GlassCard className="p-5 rounded-2xl apple-liquid-glass flex items-center gap-4">
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
            alt={`Direct booking QR code for ${hotelName}`}
            className="w-20 h-20 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">
              Direct Booking QR
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Place on reception counter stands or room key cards.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* 2. 1-Line Embed Code Generator Studio */}
      <GlassCard className="p-6 rounded-3xl apple-liquid-glass space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            1-Line Website Embed Snippet Generator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Paste this single script tag into WordPress, Webflow, Squarespace, or custom HTML to add
            a high-converting booking bar to your official website.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-layout`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Widget Layout Style
            </label>
            <SegmentedControl
              options={[
                { id: "floating", label: "Floating Bottom Pill" },
                { id: "inline", label: "Inline Hero Bar" },
              ]}
              value={layout}
              onChange={(l) => setLayout(l as "floating" | "inline")}
              size="md"
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-theme`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Color &amp; Glass Theme
            </label>
            <select
              id={`${formId}-theme`}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-xs font-semibold text-slate-900 dark:text-white min-h-[44px]"
            >
              {WIDGET_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              HTML Embed Code
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[32px] inline-flex items-center gap-1"
            >
              {copiedCode ? "Copied Snippet!" : "Copy Snippet"}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
            {embedCode}
          </pre>
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Main ChannelsAndDirectPage Component (Cognitive Complexity <= 12)
// ============================================================================

export function ChannelsAndDirectPage({
  tenantId = DEFAULT_TENANT_ID,
  hotelName = DEFAULT_HOTEL_NAME,
  initialTab = "CHANNELS_ARI",
  onTabChange,
  className = "",
}: ChannelsAndDirectPageProps) {
  const [activeTab, setActiveTab] = useState<ChannelsPageTab>(initialTab);
  const [isWebhooksOpen, setIsWebhooksOpen] = useState<boolean>(false);

  const handleTabSwitch = (tab: ChannelsPageTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const directBookingUrl = `https://book.srilankahms.com/book/${tenantId}`;
  const tabConfig = getTabDisplayConfig(activeTab);

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* 1. Header Toolbar */}
      <HeaderKpiBar
        onOpenWebhooks={() => setIsWebhooksOpen(true)}
        onOpenPortal={() => undefined}
        portalUrl={directBookingUrl}
      />

      {/* 2. Primary Navigation Tabs */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <SegmentedControl
          options={CHANNELS_PAGE_TABS}
          value={activeTab}
          onChange={handleTabSwitch}
          size="lg"
        />
      </div>

      {/* 3. Section Title & Context Subtitle */}
      <div className="border-l-2 border-blue-500 pl-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{tabConfig.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{tabConfig.subtitle}</p>
      </div>

      {/* 4. Tab Content Panes */}
      <div>
        {activeTab === "CHANNELS_ARI" && <ChannelManagerView propertyTitle={hotelName} />}

        {activeTab === "RESTRICTIONS" && <QuickRestrictionsBar />}

        {activeTab === "COMMISSIONS" && <OtaCommissionTable propertyTitle={hotelName} />}

        {activeTab === "BANK_PROMOS" && <BankPromoManager />}

        {activeTab === "DIRECT_WIDGET" && (
          <DirectWidgetStudio tenantId={tenantId} hotelName={hotelName} />
        )}
      </div>

      {/* 5. Webhook Inspector Drawer */}
      <WebhookLogDrawer isOpen={isWebhooksOpen} onClose={() => setIsWebhooksOpen(false)} />
    </div>
  );
}
