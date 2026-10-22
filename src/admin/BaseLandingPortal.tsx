/**
 * Base Landing Portal & 7-Workspace Touchpoint Launcher (Screen 01).
 * Matches Screen 01 of LankaHMS_Cloud_Unified_v5_Suite with 1:1 precision.
 * Provides unified role & touchpoint launcher across all core workspaces,
 * 4-card portfolio telemetry, and Ceylon botanical styling.
 */

import { navigateTo } from "../lib/router.js";

interface WorkspaceCard {
  readonly id: string;
  readonly badgeNumber: string;
  readonly badgeLabel: string;
  readonly routeTag: string;
  readonly title: string;
  readonly description: string;
  readonly bottomLabel: string;
  readonly bottomValue: string;
  readonly buttonText: string;
  readonly targetUrl: string;
}

const WORKSPACE_CARDS: readonly WorkspaceCard[] = [
  {
    id: "admin",
    badgeNumber: "1",
    badgeLabel: "Primary Back-Office",
    routeTag: "/admin • 14 Modules",
    title: "Hotel PMS & ERP Admin Workspace",
    description:
      "Complete Front Desk 14-day tape chart, Sri Lankan NIC/Passport OCR check-in, DMC voucher split folios, SLTDA/IRD tax returns, Poruwa wedding BEOs, Ayurveda Dosha schedules, FIFO stores & 10% SC payroll.",
    bottomLabel: "Active Property: Ceylon Sapphire Resort (Galle)",
    bottomValue: "14/18 Occupied",
    buttonText: "Enter Hotel Admin Workspace (/admin) →",
    targetUrl: "/admin",
  },
  {
    id: "qr",
    badgeNumber: "2",
    badgeLabel: "Zero-Login Guest PWA",
    routeTag: "/qr / :tenantId / :code",
    title: "Contactless Room & Table QR Experience",
    description:
      "Instant mobile web app in English, සිංහල & தமிழ். Recognizes active guest meal plan (BB/HB/FB/AI), highlights free dishes, customizes spice level, verifies 4-digit room PIN, and tracks live KDS status.",
    bottomLabel: "Sample Session: Suite 104 • Mr. Kasun Perera (HB)",
    bottomValue: "PIN: 4821",
    buttonText: "Simulate Suite 104 Guest QR Scan →",
    targetUrl: "/qr/tenant-galle-fort/room-104",
  },
  {
    id: "staff",
    badgeNumber: "3",
    badgeLabel: "Tablet POS & Dark OLED KDS",
    routeTag: "/staff/pos • /staff/kds",
    title: "Waiter POS, Kitchen KDS & Bar BOT",
    description:
      "Shared tablet 4-digit PIN sign-in, 20-table interactive floor map, automatic room meal-plan entitlement check, Dark OLED Kitchen Kanban with Sinhala/Tamil tickets, and Pool Bar 25ml/50ml peg sync.",
    bottomLabel: "Active Queue: 4 Kitchen KDS • 2 Pool Bar BOT",
    bottomValue: "Avg Prep: 11m",
    buttonText: "Launch Staff POS & KDS Terminals →",
    targetUrl: "/staff",
  },
  {
    id: "booking",
    badgeNumber: "4",
    badgeLabel: "0% Commission Web Engine",
    routeTag: "/book / :tenantId",
    title: "Direct Booking Engine & Pre-Check-In",
    description:
      "Dual-currency Sri Lankan Resident (LKR) vs Foreign Visitor (USD) booking catalog, Sampath/Commercial/HNB credit card promo auto-discounts, free chauffeur bed allocation, and PayHere/LankaQR checkout.",
    bottomLabel: "Active Promo: Sampath Visa Signature (-25%)",
    bottomValue: "0% OTA Fee",
    buttonText: "Open Public Direct Booking Engine →",
    targetUrl: "/book/tenant-galle-fort",
  },
  {
    id: "banquets",
    badgeNumber: "5",
    badgeLabel: "Wedding & MICE Portal",
    routeTag: "/events • /admin/banquets",
    title: "Poruwa Wedding & Banquet Inquiry Hub",
    description:
      "Interactive Grand Ballroom & Lawn availability checker, auspicious Nekath ceremony timeline builder, per-kg Sri Lankan bite plate calculator, corkage gate-pass, and 3-stage deposit scheduler.",
    bottomLabel: "Next Event: Perera & Senanayake Poruwa (200 Pax)",
    bottomValue: "BEO #108",
    buttonText: "Open Wedding & Banquet Planner →",
    targetUrl: "/admin/banquets",
  },
  {
    id: "demo",
    badgeNumber: "6",
    badgeLabel: "Guided Demo & Super-Admin",
    routeTag: "/demo • /admin/saas",
    title: "Interactive Demo Sandbox & Cloud Console",
    description:
      "Pre-seeded with 18 suites, 25 authentic trilingual Sri Lankan dishes, Walkers/Aitken Spence DMC contracts, and live multi-tenant SaaS quota monitoring across AWS Mumbai ap-south-1.",
    bottomLabel: "3-Repo CI/CD: Frontend + Backend + Infra",
    bottomValue: "500/500 Steps ✓",
    buttonText: "Launch Guided Demo Tour (/demo) →",
    targetUrl: "/admin/saas",
  },
];

export function BaseLandingPortal() {
  return (
    <div className="min-h-screen bg-[#F4F7F5] dark:bg-slate-950 font-sf-pro p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto antialiased">
      {/* 1. Master Botanical Hero Banner (Deep Emerald #082F21) */}
      <div className="bg-[#082F21] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden border border-emerald-950/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-900/60 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
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
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block">
                LankaHMS Cloud • Unified Sri Lankan Hospitality Operating System
              </span>
              <span className="text-xs text-emerald-300/80 block font-mono">
                https://d2pf537unmm77a.cloudfront.net/ • AWS Mumbai (ap-south-1) Serverless Stack •
                3,179 Automated Tests Passing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono font-bold text-emerald-200 border border-white/10">
              CBSL USD 1 = Rs. 298.50
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
              4-Stage Tax: 34.343%
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
              EN • සිංහල • தமிழ்
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display leading-tight">
              Ayubowan • Select Your Property Workspace or Guest Touchpoint
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Unified multi-property PMS, Dual-Currency LKR/USD Engine, Split DMC Folios,
              Contactless Room QR PWA, Tablet POS, Dark OLED KDS & Statutory SLTDA/IRD Compliance.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo("/login")}
              className="px-5 py-2.5 rounded-xl border border-white/30 text-white font-semibold text-xs hover:bg-white/10 transition-all cursor-pointer min-h-[44px]"
            >
              Sign In (/login)
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/register")}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer min-h-[44px] flex items-center gap-2"
            >
              <span>Launch 5-Min Setup Wizard (/admin)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Portfolio 4-Card Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Portfolio Properties
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Multi-Tenant
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              5 Resorts Live
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-2">
            <span>Galle, Ella, Kandy, Pelmadulla, Mirissa</span>
            <span className="font-semibold text-emerald-600">78.0% Avg Occ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Tax Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              IRD RAMIS Verified
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              1.34343× Cascade
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-2">
            <span>10% SC → 1% TDL → 2.5% SSCL → 18% VAT</span>
            <span className="font-semibold text-emerald-600">Exact Integer Cents</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contactless QR & POS Stream
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              AppSync WebSockets
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              36 QR Endpoints
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-2">
            <span>Suites, Pool Cabanas & Restaurant Tables</span>
            <span className="font-semibold text-emerald-600">&lt;50ms KDS Sync</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AWS Mumbai Free-Tier Telemetry
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              $0.00 / mo
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              20 / 25 RCU
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-2">
            <span>DynamoDB HmsTable + Graviton2 Lambda</span>
            <span className="font-semibold text-emerald-600">100% Always-Free</span>
          </div>
        </div>
      </div>

      {/* 3. The 6 Workspaces Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {WORKSPACE_CARDS.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all hover:border-emerald-300"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {card.badgeNumber} • {card.badgeLabel}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{card.routeTag}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {card.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {card.description}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{card.bottomLabel}</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {card.bottomValue}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigateTo(card.targetUrl)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0B6E4F] hover:bg-[#09543C] text-white font-bold text-xs transition-all shadow-sm cursor-pointer text-center"
              >
                {card.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
