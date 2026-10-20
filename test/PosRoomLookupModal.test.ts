/**
 * Unit Tests for Step 286: POS Room-Lookup & Guest Meal-Plan Entitlement Checker (PosRoomLookupModal.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ACTIVE_GUEST_STAYS,
  type GuestStayInfo,
  PosRoomLookupModal,
  type PosRoomLookupModalProps,
} from "../src/staff/pos/index.js";

describe("Step 286: POS Room-Lookup & Guest Meal-Plan Entitlement Checker (PosRoomLookupModal.tsx)", () => {
  const noop = () => {
    // test no-op
  };

  // --------------------------------------------------------------------------
  // 1. In-House Guest Stay Dataset & Meal Plan Entitlements
  // --------------------------------------------------------------------------
  describe("1. Guest Stays & Meal Plan Model", () => {
    it("contains authentic in-house stays covering RO, BB, HB, FB, and AI", () => {
      assert.ok(DEFAULT_ACTIVE_GUEST_STAYS.length >= 5);

      const plans = DEFAULT_ACTIVE_GUEST_STAYS.map((s) => s.mealPlan);
      assert.ok(plans.includes("RO"));
      assert.ok(plans.includes("BB"));
      assert.ok(plans.includes("HB"));
      assert.ok(plans.includes("FB"));
      assert.ok(plans.includes("AI"));
    });

    it("verifies Room 104 has Half Board entitlement including Breakfast and Dinner", () => {
      const room104 = DEFAULT_ACTIVE_GUEST_STAYS.find((s) => s.roomNumber === "104");
      assert.ok(room104);
      assert.strictEqual(room104.guestName, "Mr. David Perera");
      assert.strictEqual(room104.mealPlan, "HB");
      assert.ok(room104.includedMeals.includes("BREAKFAST"));
      assert.ok(room104.includedMeals.includes("DINNER"));
      assert.ok(!room104.includedMeals.includes("LUNCH"));
      assert.ok(room104.allergies?.includes("Shellfish / Crab"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Rendering & Modal Visibility
  // --------------------------------------------------------------------------
  describe("2. React Static Rendering & Entitlement Display", () => {
    it("returns empty string when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosRoomLookupModal, {
          isOpen: false,
          onClose: noop,
          onSelectRoom: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal with Room 104 guest details and meal entitlement when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosRoomLookupModal, {
          isOpen: true,
          onClose: noop,
          onSelectRoom: noop,
          currentMealService: "DINNER",
        }),
      );

      assert.ok(html.includes('data-testid="pos-room-lookup-modal"'));
      assert.ok(html.includes("Room Lookup &amp; Meal-Plan Entitlement"));
      assert.ok(html.includes("Prevent Buffet Leakage"));

      // Room 104 Details
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Mr. David Perera"));
      assert.ok(html.includes("2 Adults, 1 Child"));
      assert.ok(html.includes("HB"));

      // Meal Entitlement status
      assert.ok(html.includes("DINNER Included in Stay Plan"));
      assert.ok(html.includes("Shellfish / Crab"));
      assert.ok(html.includes("Outstanding Balance"));
      assert.ok(html.includes("Credit Limit"));
      assert.ok(html.includes("Charge Order to Room 104"));
    });

    it("renders quick room selector buttons (101, 104, 201, 204, 302)", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosRoomLookupModal, {
          isOpen: true,
          onClose: noop,
          onSelectRoom: noop,
        }),
      );

      assert.ok(html.includes("Quick Rooms:"));
      assert.ok(html.includes("101"));
      assert.ok(html.includes("104"));
      assert.ok(html.includes("201"));
      assert.ok(html.includes("204"));
      assert.ok(html.includes("302"));
    });

    it("renders trilingual localization in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(PosRoomLookupModal, {
          isOpen: true,
          onClose: noop,
          onSelectRoom: noop,
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("කාමර ගිණුම සහ ආහාර සැලැස්ම පරීක්ෂාව"));
      assert.ok(htmlSi.includes("ඉක්මන් කාමර:"));
      assert.ok(htmlSi.includes("කාමර ගිණුමට බිල් කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(PosRoomLookupModal, {
          isOpen: true,
          onClose: noop,
          onSelectRoom: noop,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("அறை தேடல் &amp; உணவுத் திட்ட சரிபார்ப்பு"));
      assert.ok(htmlTa.includes("விரைவு அறைகள்:"));
      assert.ok(htmlTa.includes("அறை கணக்கில் பில் செய்"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Constructible Types & Interfaces
  // --------------------------------------------------------------------------
  describe("3. Constructible Domain Types", () => {
    it("validates constructible GuestStayInfo and props", () => {
      const customStay: GuestStayInfo = {
        stayId: "stay-999",
        roomNumber: "Penthouse 01",
        guestName: "Sir Arthur C. Clarke",
        nicOrPassport: "LK00000001",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-31",
        adultsCount: 2,
        childrenCount: 0,
        mealPlan: "AI",
        mealPlanName: "All Inclusive VIP",
        includedMeals: ["BREAKFAST", "LUNCH", "DINNER"],
        hasCreditFacility: true,
        currentOutstandingLkr: 25000,
        creditLimitLkr: 500000,
        isVip: true,
      };

      const props: PosRoomLookupModalProps = {
        isOpen: true,
        onClose: noop,
        onSelectRoom: noop,
        stays: [customStay],
      };

      assert.strictEqual(props.isOpen, true);
      assert.strictEqual(props.stays?.[0]?.roomNumber, "Penthouse 01");
    });
  });
});
