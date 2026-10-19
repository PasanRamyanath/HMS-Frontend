import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PRINT_ITEMS,
  type QrPrintItem,
  QrPrintSheetModal,
  type QrPrintSheetModalProps,
  type QrPrintSheetOptions,
  renderTableStickerSvg,
  validatePrintOptions,
} from "../src/admin/rooms/QrPrintSheetModal.js";

describe("Printable Acrylic Stand & Table Sticker QR Sheet Generator (QrPrintSheetModal.tsx)", () => {
  describe("validatePrintOptions", () => {
    it("validates successful print sheet options with WiFi enabled", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "Amaya Beachfront Resort",
        layout: "TABLE_STICKER_6UP",
        includeWifi: true,
        wifiSsid: "AmayaGuest",
        wifiPassword: "pass",
        showTrilingualCallout: true,
      };

      const result = validatePrintOptions(options);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });

    it("rejects options with blank hotel name", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "   ",
        layout: "TENT_CARD_2UP",
        includeWifi: false,
        showTrilingualCallout: false,
      };

      const result = validatePrintOptions(options);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.error, "Hotel property name cannot be empty.");
    });

    it("rejects options with WiFi enabled but blank SSID", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "Amaya Resort",
        layout: "MINI_BADGE_12UP",
        includeWifi: true,
        wifiSsid: "  ",
        showTrilingualCallout: true,
      };

      const result = validatePrintOptions(options);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.error, "WiFi SSID is required when WiFi credentials are enabled.");
    });

    it("accepts options when WiFi is disabled even if SSID is missing", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "Amaya Resort",
        layout: "TABLE_STICKER_6UP",
        includeWifi: false,
        showTrilingualCallout: false,
      };

      const result = validatePrintOptions(options);
      assert.strictEqual(result.isValid, true);
    });
  });

  describe("renderTableStickerSvg", () => {
    const sampleItem: QrPrintItem = {
      id: "item-t01",
      label: "Table T-01",
      subLabel: "Ocean Breeze Terrace",
      qrUrl: "https://stay.resort.lk/qr/demo/loc-t01",
    };

    it("generates an SVG string containing hotel name, table label, and sub-label", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "Amaya Beachfront Resort",
        layout: "TABLE_STICKER_6UP",
        includeWifi: false,
        showTrilingualCallout: false,
      };

      const svg = renderTableStickerSvg(sampleItem, options);
      assert.ok(svg.includes("<svg"));
      assert.ok(svg.includes("</svg>"));
      assert.ok(svg.includes("Amaya Beachfront Resort"));
      assert.ok(svg.includes("Table T-01"));
      assert.ok(svg.includes("Ocean Breeze Terrace"));
      assert.ok(svg.includes("Scan with Phone Camera"));
      assert.strictEqual(svg.includes("WiFi:"), false);
      assert.strictEqual(svg.includes("ස්කෑන් කර ඇණවුම් කරන්න"), false);
    });

    it("includes WiFi credentials and trilingual prompt when enabled", () => {
      const options: QrPrintSheetOptions = {
        hotelName: "Amaya Beachfront Resort",
        layout: "TABLE_STICKER_6UP",
        includeWifi: true,
        wifiSsid: "AmayaGuest",
        wifiPassword: "SecurePass2026",
        showTrilingualCallout: true,
      };

      const svg = renderTableStickerSvg(sampleItem, options);
      assert.ok(svg.includes("WiFi: AmayaGuest"));
      assert.ok(svg.includes("• Pass: SecurePass2026"));
      assert.ok(svg.includes("ස්කෑන් කර ඇණවුම් කරන්න • ஸ்கேன் செய்து ஆர்டர் செய்க"));
    });
  });

  describe("QrPrintSheetModal Component Rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const props: QrPrintSheetModalProps = {
        isOpen: false,
        onClose: () => {
          /* no-op */
        },
        items: DEFAULT_PRINT_ITEMS,
      };

      const html = renderToStaticMarkup(React.createElement(QrPrintSheetModal, props));
      assert.strictEqual(html, "");
    });

    it("renders modal structure with default items and controls when open", () => {
      const props: QrPrintSheetModalProps = {
        isOpen: true,
        onClose: () => {
          /* no-op */
        },
        items: DEFAULT_PRINT_ITEMS,
        hotelName: "Heritage Villa Galle",
        defaultLayout: "TABLE_STICKER_6UP",
      };

      const html = renderToStaticMarkup(React.createElement(QrPrintSheetModal, props));
      assert.ok(html.includes("Printable Acrylic Stand &amp; Table Sticker QR Sheet Generator"));
      assert.ok(html.includes("Heritage Villa Galle"));
      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Table T-01"));
      assert.ok(html.includes("Print A4 Sheet"));
      assert.ok(html.includes("Select All"));
      assert.ok(html.includes("Deselect All"));
    });

    it("renders tent card layout (TENT_CARD_2UP) cleanly", () => {
      const customItems: ReadonlyArray<QrPrintItem> = [
        {
          id: "villa-1",
          label: "Villa 101",
          subLabel: "Private Plunge Pool",
          qrUrl: "https://stay.resort.lk/qr/demo/villa-101",
        },
      ];

      const props: QrPrintSheetModalProps = {
        isOpen: true,
        onClose: () => {
          /* no-op */
        },
        items: customItems,
        defaultLayout: "TENT_CARD_2UP",
      };

      const html = renderToStaticMarkup(React.createElement(QrPrintSheetModal, props));
      assert.ok(html.includes("Villa 101"));
      assert.ok(html.includes("Tent Card (2/Page)"));
    });

    it("renders fallback DEFAULT_PRINT_ITEMS if empty items array is passed", () => {
      const props: QrPrintSheetModalProps = {
        isOpen: true,
        onClose: () => {
          /* no-op */
        },
        items: [],
      };

      const html = renderToStaticMarkup(React.createElement(QrPrintSheetModal, props));
      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Lounger P-01"));
    });
  });
});
