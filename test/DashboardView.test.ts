import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_EXECUTIVE_METRICS,
  DEFAULT_KDS_ORDERS,
  DEFAULT_MOVEMENTS,
  DEFAULT_REVENUE_TREND,
  DEFAULT_TAX_LIABILITY,
  DEFAULT_TOP_DISHES,
  DashboardView,
  type DashboardViewProps,
  type GuestMovement,
  type KdsOrder,
  type TaxLiabilitySummary,
  type TodayExecutiveMetrics,
} from "../src/admin/DashboardView.js";

describe("Apple Bento-Grid Executive Hotel Dashboard (DashboardView.tsx)", () => {
  describe("Default Render & Structural Integrity", () => {
    it("renders complete Executive Dashboard with default props and mock fixtures", () => {
      const html = renderToStaticMarkup(React.createElement(DashboardView));

      // Header
      assert.ok(
        html.includes("Galle Fort Lighthouse Villa"),
        "Should render default hotel property title",
      );
      assert.ok(html.includes("Live Sync"), "Should display Live Sync indicator");
      assert.ok(html.includes("Executive Performance Bento Grid"), "Should show subtitle");

      // Executive Financial KPI Cards
      assert.ok(html.includes("RevPAR (LKR / USD)"), "Should render RevPAR KPI card");
      assert.ok(html.includes("ADR (Average Daily Rate)"), "Should render ADR KPI card");
      assert.ok(
        html.includes("Today&#x27;s Gross Billing") || html.includes("Today's Gross Billing"),
        "Should render Gross Billing KPI card",
      );
      assert.ok(html.includes("In-House Guest Roster"), "Should render Guest Roster KPI card");
      assert.ok(html.includes("24"), "Should display 24 occupied rooms");
      assert.ok(html.includes("28 Rooms"), "Should display 28 total rooms");

      // Middle Row Bento Cards
      assert.ok(
        html.includes("Occupancy &amp; Housekeeping") || html.includes("Occupancy & Housekeeping"),
        "Should render Occupancy section",
      );
      assert.ok(html.includes("Clean"), "Should show Clean rooms count");
      assert.ok(html.includes("Touch-Up"), "Should show Touch-Up rooms count");
      assert.ok(html.includes("Dirty"), "Should show Dirty rooms count");

      assert.ok(
        html.includes("Today&#x27;s Cumulative Revenue Trajectory") ||
          html.includes("Today's Cumulative Revenue Trajectory"),
        "Should render Revenue Trajectory card",
      );
      assert.ok(
        html.includes("SLTDA &amp; IRD Liabilities") || html.includes("SLTDA & IRD Liabilities"),
        "Should render Tax card",
      );
      assert.ok(html.includes("10% Service Charge (Staff Pool)"), "Should render SC item");
      assert.ok(html.includes("1% SLTDA Tourism Dev Levy (TDL)"), "Should render TDL item");

      // Bottom Row Bento Cards
      assert.ok(
        html.includes("Live KDS &amp; Room Service Queue") ||
          html.includes("Live KDS & Room Service Queue"),
        "Should render KDS queue",
      );
      assert.ok(html.includes("ORD-8401"), "Should render first mock KDS ticket");
      assert.ok(html.includes("Villa 04 (Ocean Suite)"), "Should show location name");

      assert.ok(
        html.includes("Today&#x27;s Arrivals &amp; Departures") ||
          html.includes("Today's Arrivals & Departures"),
        "Should render Arrivals and Departures roster",
      );
      assert.ok(html.includes("Lord Julian Sterling"), "Should render arriving guest name");

      assert.ok(
        html.includes("Top Revenue Dishes &amp; Drinks") ||
          html.includes("Top Revenue Dishes & Drinks"),
        "Should render top dishes section",
      );
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"), "Should render top dish name");
    });

    it("renders with customized metrics and properties", () => {
      const customMetrics: TodayExecutiveMetrics = {
        revParLkr: 48000,
        revParChangePercent: 25.0,
        adrLkr: 52000,
        adrChangePercent: 18.5,
        totalRevenueLkr: 1440000,
        totalRevenueChangePercent: 30.0,
        occupiedRooms: 18,
        totalRooms: 20,
        cleanRooms: 16,
        inProgressRooms: 2,
        dirtyRooms: 2,
      };

      const customTax: TaxLiabilitySummary = {
        serviceChargeLkr: 144000,
        tdlLkr: 14400,
        ssclLkr: 39600,
        vatLkr: 294624,
        settlementDueDays: 5,
      };

      const html = renderToStaticMarkup(
        React.createElement(DashboardView, {
          propertyTitle: "Sigiriya Rock Heritage Resort",
          metrics: customMetrics,
          taxLiability: customTax,
          isLiveSyncing: false,
        }),
      );

      assert.ok(
        html.includes("Sigiriya Rock Heritage Resort"),
        "Should render custom property title",
      );
      assert.ok(
        !html.includes("Live Sync"),
        "Live Sync badge should not be present when isLiveSyncing=false",
      );
      assert.ok(html.includes("18"), "Should show 18 occupied rooms");
      assert.ok(html.includes("20 Rooms"), "Should show 20 total rooms");
      assert.ok(html.includes("Due in 5d"), "Should display custom due days");
    });

    it("renders refresh button when onRefresh callback is supplied", () => {
      let refreshed = false;
      const onRefresh = () => {
        refreshed = true;
      };
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, {
          onRefresh,
        }),
      );

      assert.ok(html.includes('aria-label="Refresh Dashboard"'), "Should render refresh button");
      assert.equal(refreshed, false);
    });

    it("renders KDS order advance buttons when onOrderAction callback is supplied", () => {
      const actions: string[] = [];
      const onOrderAction = (id: string, action: string) => {
        actions.push(`${id}:${action}`);
      };
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, {
          onOrderAction,
        }),
      );

      assert.ok(
        html.includes("Ready") || html.includes("Cook") || html.includes("Dispatch"),
        "Should render order action buttons",
      );
      assert.equal(actions.length, 0);
    });

    it("renders KDS_FEED tab view when initialTab is KDS_FEED", () => {
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, { initialTab: "KDS_FEED" }),
      );
      assert.ok(html.includes("Total In-Flight"), "Should render KDS feed KPI ribbon");
      assert.ok(html.includes("Launch Staff KDS"), "Should render KDS launch button");
      assert.ok(html.includes("ORD-8401"), "Should render in-flight orders");
    });

    it("renders TAX_LIABILITIES tab view when initialTab is TAX_LIABILITIES", () => {
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, { initialTab: "TAX_LIABILITIES" }),
      );
      assert.ok(
        html.includes("Sri Lanka SLTDA &amp; IRD Statutory Tax Liabilities") ||
          html.includes("Sri Lanka SLTDA & IRD Statutory Tax Liabilities"),
        "Should render Tax liabilities header",
      );
      assert.ok(html.includes("Statutory Tax Compounding Mechanism"));
      assert.ok(html.includes("10% Service Charge"));
      assert.ok(html.includes("RAMIS 2.0 Settlement Window"));
    });

    it("renders TOP_DISHES tab view when initialTab is TOP_DISHES", () => {
      const html = renderToStaticMarkup(
        React.createElement(DashboardView, { initialTab: "TOP_DISHES" }),
      );
      assert.ok(
        html.includes("Top Revenue Dishes &amp; Beverage Performance") ||
          html.includes("Top Revenue Dishes & Beverage Performance"),
        "Should render Top dishes header",
      );
      assert.ok(html.includes("Revenue Ranking Chart"));
      assert.ok(html.includes("Bestsellers Breakdown"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types and default constants", () => {
      assert.ok(DEFAULT_EXECUTIVE_METRICS.revParLkr > 0);
      assert.ok(DEFAULT_TAX_LIABILITY.serviceChargeLkr > 0);
      assert.equal(DEFAULT_REVENUE_TREND.length, 7);
      assert.equal(DEFAULT_TOP_DISHES.length, 4);
      assert.equal(DEFAULT_KDS_ORDERS.length, 3);
      assert.equal(DEFAULT_MOVEMENTS.length, 4);

      const kdsItem: KdsOrder = {
        id: "test-1",
        orderNumber: "ORD-999",
        locationName: "Room 101",
        itemsSummary: "Tea",
        placedTime: "Just now",
        status: "SUBMITTED",
        totalLkr: 800,
      };
      assert.equal(kdsItem.id, "test-1");

      const movement: GuestMovement = {
        id: "mov-test",
        guestName: "Guest Test",
        roomNumber: "102",
        type: "ARRIVAL",
        time: "15:00",
        status: "CONFIRMED",
      };
      assert.equal(movement.type, "ARRIVAL");

      const viewProps: DashboardViewProps = {
        propertyTitle: "Test",
      };
      assert.equal(viewProps.propertyTitle, "Test");
    });
  });
});
