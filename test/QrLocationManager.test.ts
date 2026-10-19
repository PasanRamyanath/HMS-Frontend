import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BulkCreateQrLocationConfig,
  DEFAULT_QR_LOCATIONS,
  QrLocationManager,
  type QrLocationManagerProps,
  type QrLocationType,
  generateBulkQrLocations,
  getLocationTypeBadgeColor,
  getLocationTypeLabel,
  validateQrLocation,
} from "../src/admin/rooms/QrLocationManager.js";

describe("Restaurant Tables, Pool Loungers & Cabana QR Location Manager (QrLocationManager.tsx)", () => {
  describe("Bulk QR Generator (generateBulkQrLocations)", () => {
    it("generates sequential dining tables (Table T-01 to T-05) accurately", () => {
      const config: BulkCreateQrLocationConfig = {
        prefix: "Table T-",
        startNumber: 1,
        endNumber: 5,
        locationType: "RESTAURANT_TABLE",
        outletOrZone: "Main Seafood Terrace",
        baseUrl: "https://stay.resort.lk/qr/stay-1",
        orderingEnabled: true,
        serviceCallingEnabled: true,
      };

      const locs = generateBulkQrLocations(config);
      assert.strictEqual(locs.length, 5);
      const first = locs[0];
      const last = locs[4];
      assert.ok(first);
      assert.ok(last);
      assert.strictEqual(first.label, "Table T-01");
      assert.strictEqual(first.locationType, "RESTAURANT_TABLE");
      assert.strictEqual(first.outletOrZone, "Main Seafood Terrace");
      assert.strictEqual(first.orderingEnabled, true);
      assert.ok(first.qrPayloadUrl.includes("/loc-table-t-01"));
      assert.strictEqual(last.label, "Table T-05");
    });

    it("generates double-digit numbers cleanly without extra zero padding", () => {
      const config: BulkCreateQrLocationConfig = {
        prefix: "Sunbed S-",
        startNumber: 10,
        endNumber: 12,
        locationType: "POOL_LOUNGER",
        outletOrZone: "Lagoon Pool",
        baseUrl: "https://stay.resort.lk/qr",
        orderingEnabled: true,
        serviceCallingEnabled: false,
      };

      const locs = generateBulkQrLocations(config);
      assert.strictEqual(locs.length, 3);
      const first = locs[0];
      assert.ok(first);
      assert.strictEqual(first.label, "Sunbed S-10");
    });
  });

  describe("Location Validation (validateQrLocation)", () => {
    it("rejects empty labels", () => {
      const res = validateQrLocation(
        { label: "  ", outletOrZone: "Zone", qrPayloadUrl: "https://a.lk" },
        DEFAULT_QR_LOCATIONS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /label is required/i);
    });

    it("rejects duplicate labels case-insensitively", () => {
      const res = validateQrLocation(
        { label: "table t-01", outletOrZone: "Zone", qrPayloadUrl: "https://a.lk" },
        DEFAULT_QR_LOCATIONS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /already exists/i);
    });

    it("allows updating an existing location with the same label", () => {
      const res = validateQrLocation(
        { label: "Table T-01", outletOrZone: "New Zone", qrPayloadUrl: "https://a.lk" },
        DEFAULT_QR_LOCATIONS,
        "loc-table-t01",
      );
      assert.strictEqual(res.isValid, true);
    });

    it("rejects missing zone or payload URL", () => {
      const res1 = validateQrLocation(
        { label: "New Spot", outletOrZone: "", qrPayloadUrl: "https://a.lk" },
        DEFAULT_QR_LOCATIONS,
      );
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error ?? "", /outlet or zone/i);

      const res2 = validateQrLocation(
        { label: "New Spot", outletOrZone: "Terrace", qrPayloadUrl: "" },
        DEFAULT_QR_LOCATIONS,
      );
      assert.strictEqual(res2.isValid, false);
      assert.match(res2.error ?? "", /qr payload url is required/i);
    });
  });

  describe("Presentation Helpers", () => {
    it("maps all location types to appropriate status colors and labels", () => {
      const types: QrLocationType[] = [
        "IN_ROOM",
        "RESTAURANT_TABLE",
        "POOL_LOUNGER",
        "LOBBY_COUNTER",
      ];
      for (const t of types) {
        assert.ok(getLocationTypeBadgeColor(t));
        assert.ok(getLocationTypeLabel(t));
      }
    });
  });

  describe("Component Static Rendering & Contract", () => {
    it("renders QrLocationManager with default locations and KPI stats", () => {
      const html = renderToStaticMarkup(
        React.createElement(QrLocationManager, {} as QrLocationManagerProps),
      );
      assert.ok(html.includes("Restaurant Tables, Pool Loungers &amp; Cabana QR Locations"));
      assert.ok(html.includes("Total QR Codes"));
      assert.ok(html.includes("Restaurant Tables"));
      assert.ok(html.includes("Table T-01"));
      assert.ok(html.includes("Lounger P-01"));
      assert.ok(html.includes("Lobby Bar #1"));
      assert.ok(html.includes("+ Bulk Generate"));
      assert.ok(html.includes("+ Add Location"));
    });

    it("renders readOnly mode suppressing mutating buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(QrLocationManager, {
          readOnly: true,
        } as QrLocationManagerProps),
      );
      assert.ok(!html.includes("+ Bulk Generate"));
      assert.ok(!html.includes("+ Add Location"));
      assert.ok(!html.includes("Save Locations"));
    });
  });
});
