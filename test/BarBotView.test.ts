/**
 * Unit Tests for Step 279: Bar Order Ticket (BOT) Display & Cocktail/Beverage Queue (BarBotView.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BarBotView,
  type BarBotViewProps,
  type BarDestinationType,
  DEFAULT_BAR_TICKETS,
  filterBarTickets,
  getBarAdvanceButtonText,
  getBarDestinationMeta,
} from "../src/staff/kds/index.js";

describe("Step 279: Bar Order Ticket (BOT) Display & Cocktail Queue (BarBotView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Helper Functions & Domain Logic
  // --------------------------------------------------------------------------
  describe("1. Destination Meta & Advance Labels", () => {
    it("returns accurate destination metadata and icons in English", () => {
      const pool = getBarDestinationMeta("POOL_LOUNGER", "en");
      assert.strictEqual(pool.label, "Pool Lounger");
      assert.strictEqual(pool.icon, "🏊");
      assert.ok(pool.badgeClass.includes("cyan"));

      const cabana = getBarDestinationMeta("BEACH_CABANA", "en");
      assert.strictEqual(cabana.label, "Beach Cabana");
      assert.strictEqual(cabana.icon, "🏖️");
      assert.ok(cabana.badgeClass.includes("amber"));

      const counter = getBarDestinationMeta("BAR_COUNTER", "en");
      assert.strictEqual(counter.label, "Bar Counter");
      assert.strictEqual(counter.icon, "🍸");
    });

    it("returns trilingual destination labels in Sinhala and Tamil", () => {
      const poolSi = getBarDestinationMeta("POOL_LOUNGER", "si");
      assert.strictEqual(poolSi.label, "පිහිනුම් තටාකය");

      const poolTa = getBarDestinationMeta("POOL_LOUNGER", "ta");
      assert.strictEqual(poolTa.label, "நீச்சல் குளம்");

      const cabanaSi = getBarDestinationMeta("BEACH_CABANA", "si");
      assert.strictEqual(cabanaSi.label, "වෙරළ කබානා");

      const roomTa = getBarDestinationMeta("IN_ROOM_DINING", "ta");
      assert.strictEqual(roomTa.label, "அறை சேவை");
    });

    it("returns trilingual 1-tap bartender status advance labels", () => {
      assert.strictEqual(getBarAdvanceButtonText("NEW_ORDER", "en"), "Start Pouring / Mix");
      assert.strictEqual(getBarAdvanceButtonText("NEW_ORDER", "si"), "සකස් කිරීම ආරම්භ කරන්න");
      assert.strictEqual(getBarAdvanceButtonText("NEW_ORDER", "ta"), "தயாரிக்க தொடங்கு");

      assert.strictEqual(getBarAdvanceButtonText("COOKING", "en"), "Mark Poured & Ready");
      assert.strictEqual(getBarAdvanceButtonText("READY_TO_DELIVER", "en"), "Dispatched to Guest");
      assert.strictEqual(getBarAdvanceButtonText("COMPLETED", "en"), "");
    });

    it("filters tickets accurately by beverage category", () => {
      // ALL category returns all 4 sample tickets
      const all = filterBarTickets(DEFAULT_BAR_TICKETS, "ALL");
      assert.strictEqual(all.length, 4);

      // COCKTAILS filter returns tickets with cocktails (B-201 Arrack Sour, B-203 Gin & Tonic)
      const cocktails = filterBarTickets(DEFAULT_BAR_TICKETS, "COCKTAILS");
      assert.strictEqual(cocktails.length, 2);
      assert.ok(cocktails.some((t) => t.ticketNumber === "B-201"));
      assert.ok(cocktails.some((t) => t.ticketNumber === "B-203"));

      // BEERS_WINES filter returns ticket B-202 (Lion Draught Beer)
      const beers = filterBarTickets(DEFAULT_BAR_TICKETS, "BEERS_WINES");
      assert.strictEqual(beers.length, 1);
      assert.strictEqual(beers[0]?.ticketNumber, "B-202");

      // TEA_COFFEE filter returns ticket B-204 (Nuwara Eliya Tea Pot)
      const tea = filterBarTickets(DEFAULT_BAR_TICKETS, "TEA_COFFEE");
      assert.strictEqual(tea.length, 1);
      assert.strictEqual(tea[0]?.ticketNumber, "B-204");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Component Static Rendering & Apple HIG Standards
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    it("renders BarBotView with 3 columns and Sri Lankan resort bar orders", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, {}));

      assert.ok(html.includes('data-testid="bar-bot-view"'));
      assert.ok(html.includes("Bar Order Tracker (BOT)"));
      assert.ok(html.includes("Live Bar Queue"));

      // 3 Columns
      assert.ok(html.includes('data-testid="bar-column-new"'));
      assert.ok(html.includes('data-testid="bar-column-preparing"'));
      assert.ok(html.includes('data-testid="bar-column-ready"'));

      // Drink tickets
      assert.ok(html.includes("B-201"));
      assert.ok(html.includes("Ceylon Coconut Arrack Sour"));
      assert.ok(html.includes("Acrylic Coupe Glass"));
      assert.ok(html.includes("Dehydrated Lime Wheel"));
      assert.ok(html.includes("Old Reserve 47 Arrack"));

      // Beer ticket
      assert.ok(html.includes("B-202"));
      assert.ok(html.includes("Lion Cold Draught Beer (Pint)"));
      assert.ok(html.includes("Frosted Beer Mug"));

      // Gin ticket
      assert.ok(html.includes("B-203"));
      assert.ok(html.includes("Sigiriya Spiced Gin") && html.includes("Tonic"));

      // Tea ticket
      assert.ok(html.includes("B-204"));
      assert.ok(html.includes("Hot Nuwara Eliya Single Estate Tea Pot"));
    });

    it("renders guest notes with purple cocktail callout banner", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, {}));

      assert.ok(html.includes("VIP Poolside reservation"));
      assert.ok(html.includes("bg-purple-950/40"));
      assert.ok(html.includes("🍸"));
    });

    it("renders beverage category filter switcher in header", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, {}));

      assert.ok(html.includes("All Drinks"));
      assert.ok(html.includes("Cocktails"));
      assert.ok(html.includes("Beers &amp; Wine"));
      assert.ok(html.includes("Juices &amp; Coolers"));
      assert.ok(html.includes("Ceylon Tea &amp; Coffee"));
    });

    it("renders system controls: mute, test chime, and screen wake-lock", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, {}));

      assert.ok(html.includes("🔔"));
      assert.ok(html.includes("🎵 Test"));
      assert.ok(html.includes("💡"));
      assert.ok(html.includes("Print BOT"));
    });

    it("renders BarBotView in Sinhala localization", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, { language: "si" }));

      assert.ok(html.includes("බාර් ඇණවුම් සංදර්ශකය (BOT)"));
      assert.ok(html.includes("අලුත් පාන"));
      assert.ok(html.includes("සකස් කරමින්"));
      assert.ok(html.includes("සූදානම්"));
      assert.ok(html.includes("සියලු පාන"));
      assert.ok(html.includes("කොක්ටේල්"));
    });

    it("renders BarBotView in Tamil localization", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, { language: "ta" }));

      assert.ok(html.includes("பார் ஆர்டர் காட்சி (BOT)"));
      assert.ok(html.includes("புதிய பானங்கள்"));
      assert.ok(html.includes("தயாரிக்கப்படுகிறது"));
      assert.ok(html.includes("தயார்"));
      assert.ok(html.includes("காக்டெய்ல்"));
    });

    it("hides advance buttons when readOnly is true", () => {
      const html = renderToStaticMarkup(React.createElement(BarBotView, { readOnly: true }));

      assert.ok(!html.includes("Start Pouring"));
      assert.ok(!html.includes("↩️"));
    });

    it("validates all exported types are constructible", () => {
      const dest: BarDestinationType = "POOL_LOUNGER";
      const props: BarBotViewProps = {
        language: "en",
        readOnly: false,
      };
      assert.strictEqual(dest, "POOL_LOUNGER");
      assert.strictEqual(props.language, "en");
    });
  });
});
