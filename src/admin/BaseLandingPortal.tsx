/**
 * Base Landing Portal & 7-Mode Workspace Switcher (Screen 01).
 * Matches `01_Landing_And_7Mode_Workspace_Switcher.png` in Version 2.zip with 1:1 visual fidelity:
 * - Clean white top navigation header with Property dropdown, 7 Role Workspaces dropdown, trilingual pill, and Sign In CTA
 * - Spacious 2-column hero section: "One calm platform for every team in your hotel." + 4-metric strip + Galle Fort Lighthouse Villa photography card
 * - 4-Column workspace launcher cards with subtle borders, clean badges, concise copy, and responsive breakpoints
 * - Zero emojis, zero artificial gradients, generous whitespace
 */

import { useState } from "react";
import { ChevronDownSvgIcon, LeafLogoIcon } from "../components/SvgIcons.js";
import { navigateTo } from "../lib/router.js";

interface WorkspaceLauncherCard {
  readonly id: string;
  readonly badgeText: string;
  readonly badgeTone: "emerald" | "amber" | "blue" | "slate";
  readonly rightTag: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly targetUrl: string;
  readonly highlighted?: boolean | undefined;
}

const WORKSPACE_CARDS: readonly WorkspaceLauncherCard[] = [
  {
    id: "admin",
    badgeText: "1. Hotel PMS Admin",
    badgeTone: "emerald",
    rightTag: "14 Modules",
    title: "PMS, Folios & Statutory Tax",
    description: "Tape chart, Police B-Card, Driver Beds, Form MR-1 SLTDA, EPF/ETF & Stores.",
    actionLabel: "Launch /admin",
    targetUrl: "/admin",
    highlighted: true,
  },
  {
    id: "pos",
    badgeText: "2. Waiter POS & Hub",
    badgeTone: "amber",
    rightTag: "/staff/pos",
    title: "Terrace Bar POS & Staff Hub",
    description: "Dine-in, room charge, poolside, Z-Read register & driver meal vouchers.",
    actionLabel: "Launch /staff",
    targetUrl: "/staff",
  },
  {
    id: "kds",
    badgeText: "3. Kitchen KDS & Bar BOT",
    badgeTone: "blue",
    rightTag: "9 Tickets",
    title: "Live KDS & Beverage BOT",
    description: "3-column Kanban boards with KOT/BOT print, wake-lock & glassware specs.",
    actionLabel: "Launch KDS & BOT",
    targetUrl: "/staff/kds",
  },
  {
    id: "qr",
    badgeText: "4. Guest QR & Booking",
    badgeTone: "slate",
    rightTag: "Room 104",
    title: "Guest QR Menu & Direct Web",
    description: "In-room dining, amenities, laundry, safari breakfast & direct booking.",
    actionLabel: "Open Guest Portals",
    targetUrl: "/qr/tenant-galle-fort/room-104",
  },
];

const BADGE_TONE_CLASSES: Record<WorkspaceLauncherCard["badgeTone"], string> = {
  emerald: "bg-emerald-100/80 text-[#0B6E4F] border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200/80",
  blue: "bg-blue-50 text-blue-700 border-blue-200/80",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

export function BaseLandingPortal() {
  const [selectedProperty, setSelectedProperty] = useState("tenant-galle-fort");

  return (
    <div className="min-h-screen bg-[#F4F7F5] font-sf-pro text-slate-900 flex flex-col">
      {/* 1. Crisp White Top Navigation Bar */}
      <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B6E4F] text-white flex items-center justify-center shrink-0">
              <LeafLogoIcon size={18} />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 block leading-tight">
                Sri Lanka HMS
              </span>
              <span className="text-xs text-slate-500 block">
                Galle Fort Lighthouse Villa • Cloud Hospitality Platform
              </span>
            </div>
          </div>

          {/* Right Controls: Property Selector, 7-Mode Switcher, Language Pill, Sign In */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <select
                aria-label="Select Hotel Property"
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="min-h-[38px] pl-3.5 pr-8 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-[#0B6E4F]"
              >
                <option value="tenant-galle-fort">Galle Fort Lighthouse Villa (Galle)</option>
                <option value="tenant-kandy-hills">Kandy Mountain Bungalow (Kandy)</option>
                <option value="tenant-mirissa-bay">Mirissa Ocean Retreat (Mirissa)</option>
              </select>
              <ChevronDownSvgIcon
                size={14}
                className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              />
            </div>

            <div className="relative">
              <select
                aria-label="7 Role Workspaces Switcher"
                defaultValue="portal"
                onChange={(e) => {
                  const route = e.target.value;
                  if (route !== "portal") navigateTo(route);
                }}
                className="min-h-[38px] pl-3.5 pr-8 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#0B6E4F] appearance-none cursor-pointer focus:outline-none"
              >
                <option value="portal">7 Role Workspaces Ready</option>
                <option value="/admin">1. Hotel PMS Admin (/admin)</option>
                <option value="/staff/pos">2. Terrace Bar Waiter POS (/staff/pos)</option>
                <option value="/staff/kds">3. Kitchen Display System (/staff/kds)</option>
                <option value="/staff/bar">4. Bar Order Tracker (/staff/bar)</option>
                <option value="/staff">5. Staff Operations Hub (/staff)</option>
                <option value="/qr/tenant-galle-fort/room-104">
                  6. Room 104 Guest QR (/qr/room-104)
                </option>
                <option value="/book/tenant-galle-fort">7. Direct Booking Engine (/book)</option>
              </select>
              <ChevronDownSvgIcon
                size={14}
                className="w-3.5 h-3.5 text-[#0B6E4F] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              />
            </div>

            <div className="hidden sm:flex items-center px-3 py-1.5 min-h-[38px] rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 ">
              EN · සිං · த
            </div>

            <button
              type="button"
              onClick={() => navigateTo("/login")}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign In (/login)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* 2. Two-Column Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Copy & Metrics */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#0B6E4F] ">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E4F] " />
              <span>Sri Lanka Cloud Hospitality Suite • UTC+05:30</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              One calm platform for every team in your hotel.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Switch seamlessly between Hotel PMS Admin, Waiter POS, Kitchen KDS, Bar BOT, Staff
              Operations Hub, Room 104 Guest QR, and the Direct Booking Engine.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigateTo("/admin")}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Open Hotel PMS Admin
              </button>
              <button
                type="button"
                onClick={() => navigateTo("/book/tenant-galle-fort")}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Public Booking Engine
              </button>
              <button
                type="button"
                onClick={() => navigateTo("/qr/tenant-galle-fort/room-104")}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Room 104 QR Menu
              </button>
            </div>

            {/* 4-Column Key Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-slate-200/90 ">
              <div>
                <span className="text-xs text-slate-500 block">Occupancy</span>
                <span className="text-lg sm:text-xl font-extrabold text-[#0B6E4F] tabular-nums-lkr mt-0.5 block">
                  86% (24/28)
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Today&apos;s Billing</span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums-lkr mt-0.5 block">
                  LKR 985.6k
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">4-Stage IRD Tax</span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums-lkr mt-0.5 block">
                  1.34343×
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Channex OTA</span>
                <span className="text-lg sm:text-xl font-extrabold text-[#0B6E4F] mt-0.5 block">
                  2-Way Live
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Photography Card */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-lg aspect-[16/10]">
              <img
                src="/images/galle-fort-villa-hero.jpg"
                alt="Galle Fort Lighthouse Villa infinity pool overlooking the Indian Ocean"
                className="w-full h-full object-cover"
              />
              {/* Bottom Floating White Property Caption Card */}
              <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 bg-white/95 rounded-2xl p-4 sm:px-5 sm:py-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    UNESCO World Heritage Luxury Boutique Hotel
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5">
                    Galle Fort Lighthouse Villa • Ramparts &amp; Ocean View
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0] shrink-0 self-start sm:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E4F]" />
                  <span>24 Rooms In-House</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Four-Column Workspace Cards Grid */}
        <section
          aria-label="Role Workspaces"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2"
        >
          {WORKSPACE_CARDS.map((card) => (
            <button
              type="button"
              key={card.id}
              onClick={() => navigateTo(card.targetUrl)}
              className={`text-left rounded-2xl p-6 flex flex-col justify-between transition-all cursor-pointer border ${
                card.highlighted
                  ? "bg-[#E6F4EE]/70 border-[#A7F3D0] hover:border-[#0B6E4F]"
                  : "bg-white border-slate-200/90 hover:border-slate-300 "
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${BADGE_TONE_CLASSES[card.badgeTone]}`}
                  >
                    {card.badgeText}
                  </span>
                  <span className="text-xs font-medium text-slate-500 ">{card.rightTag}</span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-2">
                  {card.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">{card.description}</p>
              </div>

              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6E4F] ">
                  <span>{card.actionLabel}</span>
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
