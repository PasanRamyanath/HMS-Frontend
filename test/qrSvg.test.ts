import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type LankaQrSvgOptions,
  type QrErrorCorrectionLevel,
  type QrMatrix,
  type QrSvgOptions,
  type RoomStandQrOptions,
  generateQrMatrix,
  generateQrSvg,
  renderLankaQrSvg,
  renderRoomStandQrSvg,
} from "../src/lib/qrSvg.js";

describe("High-Contrast Apple-Styled SVG QR Code Generator (qrSvg.ts)", () => {
  describe("QR Matrix Generation (generateQrMatrix)", () => {
    it("generates a valid square matrix for short URLs", () => {
      const url = "https://hms.mirissa.lk/qr/tenant-1/room-101";
      const qr = generateQrMatrix(url);

      assert.ok(qr.size >= 21);
      assert.strictEqual(qr.modules.length, qr.size);
      assert.strictEqual(qr.modules[0]?.length, qr.size);

      // Top-left finder pattern center should be true (black module)
      assert.strictEqual(qr.modules[3]?.[3], true);
      // Top-right finder pattern center should be true
      assert.strictEqual(qr.modules[3]?.[qr.size - 4], true);
      // Bottom-left finder pattern center should be true
      assert.strictEqual(qr.modules[qr.size - 4]?.[3], true);
    });

    it("scales matrix version for long payloads like EMVCo LankaQR", () => {
      const emvco =
        "00020101021226580011COM.LANKAQR0112123456789012520470115303144540815000.005802LK5914MIRISSA RESORT6007MIRISSA62200516FOLIO-2026-0042630429B1";
      const qr = generateQrMatrix(emvco);

      assert.ok(qr.size >= 41, `Expected size >= 41, got ${qr.size}`);
      assert.strictEqual(qr.modules.length, qr.size);
    });
  });

  describe("SVG Generation (generateQrSvg)", () => {
    it("generates 1024x1024 crisp vector SVG with rounded finder patterns", () => {
      const svg = generateQrSvg("https://example.com", { size: 1024 });

      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.includes('viewBox="0 0 1024 1024"'));
      assert.ok(svg.includes('width="1024"'));
      assert.ok(svg.includes('height="1024"'));
      assert.ok(svg.includes('rx="48"')); // continuous squircle outer frame
    });

    it("renders center badge when centerBadgeText is provided", () => {
      const svg = generateQrSvg("https://example.com/qr", {
        size: 512,
        centerBadgeText: "ROOM 204",
        centerBadgeSubtext: "SCAN TO ORDER",
      });

      assert.ok(svg.includes("ROOM 204"));
      assert.ok(svg.includes("SCAN TO ORDER"));
      assert.ok(svg.includes("tabular-nums-lkr"));
    });
  });

  describe("Room Stand SVG (renderRoomStandQrSvg)", () => {
    it("renders complete print-ready guest room stand SVG with trilingual instructions", () => {
      const standSvg = renderRoomStandQrSvg({
        hotelName: "Mirissa Boutique Resort & Spa",
        roomNumber: "302",
        qrUrl: "https://hms.mirissa.lk/qr/mirissa-resort/room-302",
      });

      assert.ok(standSvg.includes("Mirissa Boutique Resort & Spa"));
      assert.ok(standSvg.includes("ROOM 302"));
      assert.ok(standSvg.includes("Contactless Room Service"));
      assert.ok(standSvg.includes("ස්කෑන් කර ඇණවුම් කරන්න"));
      assert.ok(standSvg.includes("ஸ்கேன் செய்து ஆர்டர் செய்க"));
      assert.ok(standSvg.includes('viewBox="0 0 1024 1400"'));
    });
  });

  describe("LankaQR Payment SVG (renderLankaQrSvg)", () => {
    it("renders CBSL LankaQR payment card with merchant name and formatted LKR amount", () => {
      const lankaQrSvg = renderLankaQrSvg({
        emvcoPayload: "00020101021226...630429B1",
        merchantName: "Galle Heritage Villa",
        amountLkr: 25400,
      });

      assert.ok(lankaQrSvg.includes("CBSL LankaQR"));
      assert.ok(lankaQrSvg.includes("Galle Heritage Villa"));
      assert.ok(lankaQrSvg.includes("LKR 25,400.00"));
      assert.ok(lankaQrSvg.includes('viewBox="0 0 1024 1120"'));
    });

    it("renders CBSL LankaQR static payment card when amount is omitted", () => {
      const lankaQrSvg = renderLankaQrSvg({
        emvcoPayload: "00020101021126...6304ABCD",
        merchantName: "Colombo Rest House",
      });

      assert.ok(lankaQrSvg.includes("CBSL LankaQR"));
      assert.ok(lankaQrSvg.includes("Colombo Rest House"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const ecLevel: QrErrorCorrectionLevel = "H";
      assert.strictEqual(ecLevel, "H");

      const matrix: QrMatrix = {
        size: 21,
        modules: [[true, false]],
      };
      assert.strictEqual(matrix.size, 21);

      const svgOpts: QrSvgOptions = {
        size: 512,
        foregroundColor: "#000000",
        backgroundColor: "#ffffff",
      };
      assert.strictEqual(svgOpts.size, 512);

      const standOpts: RoomStandQrOptions = {
        hotelName: "Grand Hotel",
        roomNumber: "101",
        qrUrl: "https://example.com",
      };
      assert.strictEqual(standOpts.roomNumber, "101");

      const lankaOpts: LankaQrSvgOptions = {
        emvcoPayload: "test",
        merchantName: "Merchant",
      };
      assert.strictEqual(lankaOpts.merchantName, "Merchant");
    });
  });
});
