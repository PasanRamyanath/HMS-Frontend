/**
 * Unit Tests for Step 277: KDS Order Ticket Card with SLA Color Escalation & Spice/Allergen Highlights (KdsTicketCard.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_KDS_TICKETS,
  type KdsTicket,
  KdsTicketCard,
  evaluateTicketSlaUrgency,
  getDietaryBadgeClass,
  getDishSubtitle,
} from "../src/staff/kds/index.js";

describe("Step 277: KDS Order Ticket Card with SLA Color Escalation & Spice/Allergen Highlights (KdsTicketCard.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. SLA Urgency Thresholds (>15 min Warning, >25 min Pulsing Red Overdue)
  // --------------------------------------------------------------------------
  describe("1. SLA Urgency Escalation", () => {
    it("classifies orders under 15 minutes as NORMAL", () => {
      const normalSla = evaluateTicketSlaUrgency(10 * 60, 20); // 10 minutes
      assert.strictEqual(normalSla.urgency, "NORMAL");
      assert.strictEqual(normalSla.isWarning, false);
      assert.strictEqual(normalSla.isOverdue, false);
      assert.strictEqual(normalSla.isPulsing, false);
      assert.ok(normalSla.borderClass.includes("border-slate-800"));
    });

    it("escalates orders >= 15 minutes to WARNING with amber border", () => {
      const warningSla = evaluateTicketSlaUrgency(15 * 60, 20); // 15 minutes
      assert.strictEqual(warningSla.urgency, "WARNING");
      assert.strictEqual(warningSla.isWarning, true);
      assert.strictEqual(warningSla.isOverdue, false);
      assert.strictEqual(warningSla.isPulsing, false);
      assert.ok(warningSla.borderClass.includes("border-amber-500"));
      assert.ok(warningSla.badgeTextClass.includes("text-amber-400"));
    });

    it("escalates orders >= 25 minutes to OVERDUE with pulsing red border", () => {
      const overdueSla = evaluateTicketSlaUrgency(25 * 60, 20); // 25 minutes
      assert.strictEqual(overdueSla.urgency, "OVERDUE");
      assert.strictEqual(overdueSla.isWarning, false);
      assert.strictEqual(overdueSla.isOverdue, true);
      assert.strictEqual(overdueSla.isPulsing, true);
      assert.ok(overdueSla.borderClass.includes("border-red-500"));
      assert.ok(overdueSla.badgeTextClass.includes("text-red-400"));
    });

    it("handles targetMinutes ratio calculations accurately", () => {
      // 10m target: 7m (70%) is warning, 11m (>100%) is overdue
      const warningRatio = evaluateTicketSlaUrgency(7 * 60, 10);
      assert.strictEqual(warningRatio.isWarning, true);

      const overdueRatio = evaluateTicketSlaUrgency(11 * 60, 10);
      assert.strictEqual(overdueRatio.isOverdue, true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Localized Subtitles & Allergen Badges
  // --------------------------------------------------------------------------
  describe("2. Localized Subtitles & Allergen Badges", () => {
    it("retrieves Sinhala and Tamil subtitles for common resort dishes", () => {
      const crabSi = getDishSubtitle("Jaffna Lagoon Crab Curry", "si");
      assert.strictEqual(crabSi, "යාපනය කලපු කකුළු කරිය");

      const crabTa = getDishSubtitle("Jaffna Lagoon Crab Curry", "ta");
      assert.strictEqual(crabTa, "யாழ்ப்பாண களப்பு நண்டு கறி");

      const kottuSi = getDishSubtitle("Mixed Seafood Kottu Roti", "si");
      assert.strictEqual(kottuSi, "මුහුදු ආහාර කොත්තු රොටී");

      const polRotiEn = getDishSubtitle("Ceylon Pol Roti with Lunumiris", "en");
      assert.strictEqual(polRotiEn, "Traditional Coconut Flatbread with Chilli Sambol");

      // Unknown dish returns null
      assert.strictEqual(getDishSubtitle("Unknown Western Burger", "si"), null);
    });

    it("maps dietary tags to distinctive color badges", () => {
      assert.ok(getDietaryBadgeClass("HALAL").includes("emerald"));
      assert.ok(getDietaryBadgeClass("DAIRY_FREE").includes("cyan"));
      assert.ok(getDietaryBadgeClass("VEGAN").includes("green"));
      assert.ok(getDietaryBadgeClass("VEGETARIAN").includes("lime"));
      assert.ok(getDietaryBadgeClass("GLUTEN-FREE").includes("purple"));
      assert.ok(getDietaryBadgeClass("NUT_FREE").includes("rose"));
      assert.ok(getDietaryBadgeClass("UNKNOWN_TAG").includes("slate"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. React Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("3. React Component Rendering & Apple HIG Standards", () => {
    const testTicket1 = DEFAULT_KDS_TICKETS[0] as KdsTicket;
    const testTicket2 = DEFAULT_KDS_TICKETS[1] as KdsTicket;
    const testTicket3 = DEFAULT_KDS_TICKETS[2] as KdsTicket;

    it("renders ticket card with order number, destination, and timer pill", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1 }),
      );

      assert.ok(html.includes("K-101"));
      assert.ok(html.includes("Room 204 (Deluxe Ocean)"));
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("Extra Spicy"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("HALAL"));
      assert.ok(html.includes("DAIRY_FREE"));
    });

    it("renders guest allergy note callout banner when notes exist", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1 }),
      );

      assert.ok(html.includes("Guest allergic to dairy"));
      assert.ok(html.includes("bg-red-950/40"));
      assert.ok(html.includes("Alert"));
    });

    it("escalates visual border to amber for tickets > 15 minutes", () => {
      const warningTicket: KdsTicket = {
        ...testTicket1,
        elapsedSeconds: 16 * 60, // 16 minutes (> 15 min)
      };

      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: warningTicket }),
      );
      assert.ok(html.includes("border-amber-500"));
    });

    it("escalates visual border to pulsing red for tickets > 25 minutes", () => {
      const overdueTicket: KdsTicket = {
        ...testTicket1,
        elapsedSeconds: 26 * 60, // 26 minutes (> 25 min)
      };

      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: overdueTicket }),
      );
      assert.ok(html.includes("border-red-500"));
      assert.ok(html.includes("animate-pulse"));
    });

    it("displays localized Sinhala and Tamil subtitles under dish titles", () => {
      // Sinhala
      const htmlSi = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1, language: "si" }),
      );
      assert.ok(htmlSi.includes("යාපනය කලපු කකුළු කරිය"));
      assert.ok(htmlSi.includes("කුස්සියට ආරම්භ කරන්න"));

      // Tamil
      const htmlTa = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1, language: "ta" }),
      );
      assert.ok(htmlTa.includes("யாழ்ப்பாண களப்பு நண்டு கறி"));
      assert.ok(htmlTa.includes("சமைக்க தொடங்கு"));
    });

    it("renders 1-tap advance button transitions correctly across states", () => {
      // NEW_ORDER ticket -> "Start Cooking"
      const newOrderHtml = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1 }),
      );
      assert.ok(newOrderHtml.includes("Start Cooking"));
      assert.ok(!newOrderHtml.includes("Undo")); // No recall on new order

      // COOKING ticket -> "Mark Plated & Ready" and has recall button
      const cookingHtml = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket2 }),
      );
      assert.ok(cookingHtml.includes("Mark Plated") && cookingHtml.includes("Ready"));
      assert.ok(cookingHtml.includes("Undo"));

      // READY_TO_DELIVER ticket -> "Dispatched / Complete"
      const readyHtml = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket3 }),
      );
      assert.ok(readyHtml.includes("Dispatched / Complete"));
      assert.ok(readyHtml.includes("Undo"));
    });

    it("hides action buttons when readOnly is enabled", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, {
          ticket: testTicket1,
          readOnly: true,
        }),
      );

      assert.ok(!html.includes("Start Cooking"));
      assert.ok(!html.includes("Undo"));
    });

    it("renders thermal print slip action button", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsTicketCard, { ticket: testTicket1 }),
      );
      assert.ok(html.includes("Print Slip"));
      assert.ok(html.includes("Print"));
    });
  });
});
