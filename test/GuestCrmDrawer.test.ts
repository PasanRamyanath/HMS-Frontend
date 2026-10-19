import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_GUEST_PROFILES,
  GuestCrmDrawer,
  type GuestCrmDrawerProps,
  type GuestPastStay,
  type GuestProfile,
  type GuestVipTier,
  computeGuestSpendMetrics,
  getVipBadgeClasses,
  searchGuestProfiles,
} from "../src/admin/frontdesk/GuestCrmDrawer.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_STAYS: readonly GuestPastStay[] = [
  {
    reservationId: "stay-1",
    bookingReference: "KDY-101",
    roomNumber: "201",
    roomCategory: "Deluxe Mountain View",
    checkInDate: "2026-09-01",
    checkOutDate: "2026-09-04", // 3 nights
    mealPlan: "HB",
    totalFolioLkr: 150000,
    paymentMethod: "Visa",
    rating: 5,
  },
  {
    reservationId: "stay-2",
    bookingReference: "KDY-102",
    roomNumber: "201",
    roomCategory: "Deluxe Mountain View",
    checkInDate: "2026-10-10",
    checkOutDate: "2026-10-12", // 2 nights
    mealPlan: "BB",
    totalFolioLkr: 100000,
    paymentMethod: "LankaQR",
    rating: 4,
  },
];

const SAMPLE_GUEST: GuestProfile = {
  id: "gst-test-1",
  fullName: "Malini Fonseka",
  identityType: "SRI_LANKAN_NIC",
  identityNumber: "551234567V",
  phone: "+94773456789",
  email: "malini.f@art.lk",
  nationality: "Sri Lankan",
  countryCode: "LK",
  vipTier: "PLATINUM",
  isBlacklisted: false,
  totalStaysCount: 2,
  totalNightsStayed: 5,
  lifetimeSpendLkr: 250000,
  roomPreferences: ["Corner Suite", "Low Floor"],
  dietaryPreferences: ["Vegetarian", "Jain Friendly"],
  specialNotes: "Veteran guest. Arrange welcome orchid garland.",
  pastStays: SAMPLE_STAYS,
};

const BLACKLISTED_GUEST: GuestProfile = {
  id: "gst-test-2",
  fullName: "Donald Wickrema",
  identityType: "FOREIGN_PASSPORT",
  identityNumber: "US99887766",
  phone: "+15559876543",
  nationality: "American",
  countryCode: "US",
  vipTier: "STANDARD",
  isBlacklisted: true,
  blacklistReason: "Disputed credit card chargeback of LKR 120,000.",
  totalStaysCount: 1,
  totalNightsStayed: 2,
  lifetimeSpendLkr: 45000,
  roomPreferences: [],
  dietaryPreferences: [],
  pastStays: [],
};

describe("Guest CRM History & Blacklist/VIP Preferences Lookup (GuestCrmDrawer.tsx)", () => {
  describe("Guest Search & Fuzzy Matching (searchGuestProfiles)", () => {
    const list = [SAMPLE_GUEST, BLACKLISTED_GUEST];

    it("returns full list when query is empty", () => {
      const results = searchGuestProfiles(list, "");
      assert.strictEqual(results.length, 2);
    });

    it("searches by guest full name case-insensitively", () => {
      const results = searchGuestProfiles(list, "malini");
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.id, "gst-test-1");
    });

    it("searches by Sri Lankan 9-digit old NIC with or without letter V", () => {
      const resultsWithV = searchGuestProfiles(list, "551234567V");
      assert.strictEqual(resultsWithV.length, 1);
      assert.strictEqual(resultsWithV[0]?.id, "gst-test-1");

      const resultsNumberOnly = searchGuestProfiles(list, "551234567");
      assert.strictEqual(resultsNumberOnly.length, 1);
      assert.strictEqual(resultsNumberOnly[0]?.id, "gst-test-1");
    });

    it("searches by foreign passport number", () => {
      const results = searchGuestProfiles(list, "US99887766");
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.id, "gst-test-2");
    });

    it("searches by phone number ignoring whitespace and dashes", () => {
      const results = searchGuestProfiles(list, "077 345 6789");
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.id, "gst-test-1");
    });

    it("returns empty array when query matches nobody", () => {
      const results = searchGuestProfiles(list, "NonExistentPerson123");
      assert.strictEqual(results.length, 0);
    });
  });

  describe("Spend & Stay Metric Computation (computeGuestSpendMetrics)", () => {
    it("computes total folio spend, total nights, and average daily rate accurately", () => {
      const metrics = computeGuestSpendMetrics(SAMPLE_STAYS);
      assert.strictEqual(metrics.calculatedTotalSpendLkr, 250000);
      assert.strictEqual(metrics.totalNights, 5); // 3 + 2
      assert.strictEqual(metrics.averageDailyRateLkr, 50000); // 250,000 / 5
    });

    it("handles empty past stays list gracefully", () => {
      const metrics = computeGuestSpendMetrics([]);
      assert.strictEqual(metrics.calculatedTotalSpendLkr, 0);
      assert.strictEqual(metrics.totalNights, 0);
      assert.strictEqual(metrics.averageDailyRateLkr, 0);
    });
  });

  describe("VIP Tier Styling (getVipBadgeClasses)", () => {
    it("returns correct color tokens for VIP and Platinum", () => {
      const vip = getVipBadgeClasses("VIP");
      assert.ok(vip.bg.includes("purple"));
      assert.ok(vip.text.includes("purple"));

      const plat = getVipBadgeClasses("PLATINUM");
      assert.ok(plat.bg.includes("purple"));
    });

    it("returns correct color tokens for Gold, Silver, and Standard", () => {
      const gold = getVipBadgeClasses("GOLD");
      assert.ok(gold.bg.includes("amber"));

      const silver = getVipBadgeClasses("SILVER");
      assert.ok(silver.bg.includes("slate"));

      const standard = getVipBadgeClasses("STANDARD");
      assert.ok(standard.bg.includes("slate"));
    });
  });

  describe("Component Rendering & Accessibility (GuestCrmDrawer)", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCrmDrawer, {
          isOpen: false,
          onClose: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders drawer dialog when isOpen is true with default guests", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCrmDrawer, {
          isOpen: true,
          onClose: noop,
        }),
      );
      assert.ok(html.includes("Guest CRM History &amp; Preferences"));
      assert.ok(html.includes("Matching Guest Profiles"));
      assert.ok(html.includes("Lifetime Spend"));
      assert.ok(html.includes("Dr. Rohitha Senaratne"));
    });

    it("renders custom guest profile with room and dietary preferences", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCrmDrawer, {
          isOpen: true,
          onClose: noop,
          guests: [SAMPLE_GUEST],
        }),
      );
      assert.ok(html.includes("Malini Fonseka"));
      assert.ok(html.includes("551234567V"));
      assert.ok(html.includes("Corner Suite"));
      assert.ok(html.includes("Vegetarian"));
      assert.ok(html.includes("Jain Friendly"));
      assert.ok(html.includes("Veteran guest. Arrange welcome orchid garland."));
      assert.ok(html.includes("KDY-101"));
    });

    it("renders blacklist alert banner when guest is blacklisted", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCrmDrawer, {
          isOpen: true,
          onClose: noop,
          guests: [BLACKLISTED_GUEST],
        }),
      );
      assert.ok(html.includes("RESTRICTED / BLACKLISTED GUEST"));
      assert.ok(html.includes("Disputed credit card chargeback of LKR 120,000."));
    });

    it("DEFAULT_GUEST_PROFILES is pre-populated with realistic Sri Lankan hotel guest profiles", () => {
      assert.ok(DEFAULT_GUEST_PROFILES.length >= 3);
      const doctor = DEFAULT_GUEST_PROFILES[0];
      assert.ok(doctor);
      assert.ok(doctor.lifetimeSpendLkr > 1000000);
      assert.strictEqual(doctor.vipTier, "VIP");
    });
  });

  describe("Contract & Type Invariants", () => {
    it("GuestVipTier adheres to strictly typed union literals", () => {
      const tiers: readonly GuestVipTier[] = ["STANDARD", "SILVER", "GOLD", "PLATINUM", "VIP"];
      assert.strictEqual(tiers.length, 5);
    });

    it("GuestCrmDrawerProps is cleanly constructible", () => {
      const props: GuestCrmDrawerProps = {
        isOpen: true,
        onClose: noop,
        initialQuery: "1972",
      };
      assert.strictEqual(props.isOpen, true);
      assert.strictEqual(props.initialQuery, "1972");
    });
  });
});
