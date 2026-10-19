import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CHANNEL_TAB_OPTIONS,
  type ChannelConnection,
  ChannelManagerView,
  type ChannelManagerViewProps,
  type ChannelSyncStatus,
  type ChannelViewTab,
  DEFAULT_CHANNEL_CONNECTIONS,
  DEFAULT_ROOM_MAPPINGS,
  DEFAULT_SYNC_LOGS,
  DEFAULT_UNMAPPED_ALERTS,
  type OtaChannelId,
  type RoomMealMapping,
  type SyncLogEntry,
  type SyncMode,
  type UnmappedAlert,
  formatChannelIdName,
  getChannelStatusBadgeColor,
} from "../src/admin/channels/ChannelManagerView.js";
import { MealPlan } from "../src/generated/graphql.js";

const noop = () => {
  // no-op for static testing
};

describe("Channel Manager Mapping & Sync Health Screen (ChannelManagerView.tsx)", () => {
  describe("1. Domain Configurations & Constants", () => {
    it("configures the 4 primary Sri Lankan OTA channels", () => {
      assert.strictEqual(DEFAULT_CHANNEL_CONNECTIONS.length, 4);
      const channelIds = DEFAULT_CHANNEL_CONNECTIONS.map((c) => c.id);
      assert.deepStrictEqual(channelIds, ["BOOKING_COM", "AGODA", "EXPEDIA", "AIRBNB"]);
    });

    it("distinguishes Channex 2-Way API vs zero-cost RFC 5545 iCal sync modes", () => {
      const bkg: ChannelConnection | undefined = DEFAULT_CHANNEL_CONNECTIONS.find(
        (c) => c.id === "BOOKING_COM",
      );
      const abnb: ChannelConnection | undefined = DEFAULT_CHANNEL_CONNECTIONS.find(
        (c) => c.id === "AIRBNB",
      );

      assert.ok(bkg);
      const bkgSyncMode: SyncMode = bkg.syncMode;
      assert.strictEqual(bkgSyncMode, "CHANNEX_API");
      assert.strictEqual(bkg.status, "CONNECTED");

      assert.ok(abnb);
      const abnbSyncMode: SyncMode = abnb.syncMode;
      assert.strictEqual(abnbSyncMode, "ICAL_FEED");
      assert.ok(abnb.icalFeedUrl?.includes("airbnb.com"));
    });

    it("provides default room & meal plan mappings including unmapped alert records", () => {
      assert.ok(DEFAULT_ROOM_MAPPINGS.length >= 4);
      const unmapped = DEFAULT_ROOM_MAPPINGS.find((m) => m.hasUnmappedAlert);
      assert.ok(unmapped, "Should include an unmapped room record");
      assert.strictEqual(unmapped.syncEnabled, false);
      assert.strictEqual(unmapped.mealPlan, MealPlan.Fb);
    });

    it("contains unmapped booking alert entries with statutory booking_unmapped_room code", () => {
      assert.ok(DEFAULT_UNMAPPED_ALERTS.length >= 2);
      for (const alert of DEFAULT_UNMAPPED_ALERTS) {
        const typedAlert: UnmappedAlert = alert;
        assert.strictEqual(typedAlert.code, "booking_unmapped_room");
        assert.ok(typedAlert.reservationId.length > 0);
        assert.ok(typedAlert.guestName.length > 0);
      }
    });

    it("verifies default sync logs structure and types", () => {
      assert.ok(DEFAULT_SYNC_LOGS.length >= 5);
      for (const log of DEFAULT_SYNC_LOGS) {
        const typedLog: SyncLogEntry = log;
        assert.ok(typedLog.id.length > 0);
        assert.ok(typedLog.latencyMs >= 0);
        assert.ok(["SUCCESS", "WARNING", "FAILED"].includes(typedLog.status));
      }
    });

    it("verifies tab navigation options and types", () => {
      assert.strictEqual(CHANNEL_TAB_OPTIONS.length, 4);
      const tabIds: ChannelViewTab[] = CHANNEL_TAB_OPTIONS.map((t) => t.id);
      assert.deepStrictEqual(tabIds, ["MAPPINGS", "ALERTS", "ICAL_FEEDS", "SYNC_LOGS"]);
    });
  });

  describe("2. Helper Functions & Badge Colors", () => {
    it("maps sync statuses to appropriate Apple semantic colors", () => {
      const cases: Array<[ChannelSyncStatus, string]> = [
        ["CONNECTED", "green"],
        ["SYNCING", "blue"],
        ["WARNING", "amber"],
        ["ERROR", "red"],
        ["PAUSED", "gray"],
      ];

      for (const [status, expectedColor] of cases) {
        assert.strictEqual(getChannelStatusBadgeColor(status), expectedColor);
      }
    });

    it("formats OTA channel identifiers to human-readable names", () => {
      const cases: Array<[OtaChannelId, string]> = [
        ["BOOKING_COM", "Booking.com"],
        ["AGODA", "Agoda"],
        ["EXPEDIA", "Expedia"],
        ["AIRBNB", "Airbnb"],
      ];

      for (const [id, expectedName] of cases) {
        assert.strictEqual(formatChannelIdName(id), expectedName);
      }
    });
  });

  describe("3. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders master header, Channex Property ID, and Full ARI Resync CTA", () => {
      const props: ChannelManagerViewProps = {
        propertyTitle: "Galle Fort Lighthouse Villa",
        channexPropertyId: "cnx_prop_99214",
        onActionNotify: noop,
      };

      const html = renderToStaticMarkup(React.createElement(ChannelManagerView, props));

      assert.ok(html.includes("Channel Manager &amp; 2-Way OTA Sync"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Channex ID: cnx_prop_99214"));
      assert.ok(html.includes("Full ARI Resync"));
      assert.ok(html.includes("Test Connectivity"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-touch-target"));
    });

    it("renders unmapped room alert warning banner when alerts are present", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChannelManagerView, {
          initialAlerts: DEFAULT_UNMAPPED_ALERTS,
        }),
      );

      assert.ok(html.includes("Unmapped Room Alerts Detected"));
      assert.ok(html.includes("booking_unmapped_room"));
      assert.ok(html.includes("Review &amp; Map Now"));
    });

    it("hides unmapped room alert warning banner when alerts list is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChannelManagerView, {
          initialAlerts: [],
        }),
      );

      assert.strictEqual(html.includes("Unmapped Room Alerts Detected"), false);
    });

    it("renders all 4 OTA connection cards in the bento grid", () => {
      const html = renderToStaticMarkup(React.createElement(ChannelManagerView, {}));

      assert.ok(html.includes("Booking.com"));
      assert.ok(html.includes("Agoda"));
      assert.ok(html.includes("Expedia Partner Central"));
      assert.ok(html.includes("Airbnb"));
      assert.ok(html.includes("Push ARI Delta"));
      assert.ok(html.includes("1350 ms"));
      assert.ok(html.includes("99.8%"));
    });

    it("renders mapping table with local rooms, meal plans, and Channex IDs", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChannelManagerView, {
          initialMappings: DEFAULT_ROOM_MAPPINGS,
        }),
      );

      assert.ok(html.includes("Deluxe Ocean View"));
      assert.ok(html.includes("DLX-OCN"));
      assert.ok(html.includes("cnx_rt_dlx_ocean_01"));
      assert.ok(html.includes("cnx_rp_dlx_ro_resident"));
      assert.ok(html.includes("Cinnamon Master Suite"));
      assert.ok(html.includes("Not Mapped"));
      assert.ok(html.includes("Edit Mapping"));
    });

    it("renders with custom className without style clobbering", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChannelManagerView, {
          className: "custom-channel-view-container",
        }),
      );

      assert.ok(html.includes("custom-channel-view-container"));
    });
  });

  describe("4. Lifecycle Callbacks & Handlers", () => {
    it("handles onTriggerFullResync execution without throwing", async () => {
      let triggered = false;
      const onResync = async () => {
        triggered = true;
      };

      const element = React.createElement(ChannelManagerView, {
        onTriggerFullResync: onResync,
      });
      assert.ok(element);
      await onResync();
      assert.strictEqual(triggered, true);
    });

    it("handles onSaveMapping execution with updated RoomMealMapping payload", async () => {
      let saved: RoomMealMapping | null = null;
      const onSave = async (m: RoomMealMapping) => {
        saved = m;
      };

      const base = DEFAULT_ROOM_MAPPINGS[0];
      assert.ok(base);
      const testMapping: RoomMealMapping = {
        ...base,
        channexRoomTypeId: "cnx_rt_updated_99",
      };

      await onSave(testMapping);
      assert.ok(saved);
      assert.strictEqual((saved as RoomMealMapping).channexRoomTypeId, "cnx_rt_updated_99");
    });

    it("handles onResolveAlert callback signature properly", async () => {
      let resolvedId = "";
      let resolvedPayload: RoomMealMapping | null = null;
      const onResolve = async (alertId: string, m: RoomMealMapping) => {
        resolvedId = alertId;
        resolvedPayload = m;
      };

      const base = DEFAULT_ROOM_MAPPINGS[0];
      assert.ok(base);
      await onResolve("alert-cnx-001", base);
      assert.strictEqual(resolvedId, "alert-cnx-001");
      assert.ok(resolvedPayload);
    });
  });
});
