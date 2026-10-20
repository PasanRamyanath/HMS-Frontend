import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LOST_FOUND_ITEMS,
  LostAndFoundView,
  type LostFoundItemRecord,
  calculateLostFoundMetrics,
  composeGuestLostFoundSms,
  formatLostFoundLkr,
  getLostFoundText,
  isItemInCustody,
  isItemMatchingFilterTab,
  isItemMatchingSearchQuery,
  resolveLostFoundCategoryBadge,
  resolveStatusBadge,
} from "../src/admin/housekeeping/LostAndFoundView.js";

const noop = () => undefined;

describe("Step 311: Lost & Found Register with Photo & Guest NIC/Phone Link (LostAndFoundView.tsx)", () => {
  describe("1. Pure Domain Metrics & SMS Composer Resolvers", () => {
    it("evaluates custody status correctly (true for active custody, false for claimed/disposed)", () => {
      assert.equal(isItemInCustody("HELD_IN_STORAGE"), true);
      assert.equal(isItemInCustody("GUEST_NOTIFIED"), true);
      assert.equal(isItemInCustody("CLAIMED_RETURNED"), false);
      assert.equal(isItemInCustody("DISPOSED_DONATED"), false);
    });

    it("calculates aggregated lost & found metrics across item records", () => {
      const items: readonly LostFoundItemRecord[] = [
        {
          itemId: "tk-1",
          referenceNumber: "LNF-001",
          itemName: "Rolex Watch",
          category: "VALUABLES",
          locationFound: "Room 101",
          foundDateIso: "2026-10-20T00:00:00Z",
          foundByStaff: "Staff",
          storageLockerNumber: "Safe S-01",
          status: "HELD_IN_STORAGE",
          estimatedValueLkr: 600000,
        },
        {
          itemId: "tk-2",
          referenceNumber: "LNF-002",
          itemName: "Sunglasses",
          category: "ACCESSORIES",
          locationFound: "Pool",
          foundDateIso: "2026-10-20T01:00:00Z",
          foundByStaff: "Staff",
          storageLockerNumber: "Locker B-02",
          status: "GUEST_NOTIFIED",
          estimatedValueLkr: 25000,
        },
        {
          itemId: "tk-3",
          referenceNumber: "LNF-003",
          itemName: "Passport",
          category: "DOCUMENTS",
          locationFound: "Lobby",
          foundDateIso: "2026-10-20T02:00:00Z",
          foundByStaff: "Staff",
          storageLockerNumber: "Safe S-02",
          status: "CLAIMED_RETURNED",
          estimatedValueLkr: 10000,
        },
      ];

      const metrics = calculateLostFoundMetrics(items);
      assert.equal(metrics.totalInCustody, 2); // tk-1 + tk-2
      assert.equal(metrics.totalHighValue, 1); // tk-1 (>= 100k)
      assert.equal(metrics.totalNotified, 1); // tk-2
      assert.equal(metrics.totalClaimed, 1); // tk-3
      assert.equal(metrics.totalEstValueLkr, 625000); // 600000 + 25000 (custody only)
    });

    it("composes personalized SMS message with property, room, item, and locker details", () => {
      const item: LostFoundItemRecord = {
        itemId: "tk-sms",
        referenceNumber: "LNF-099",
        itemName: "iPad Pro",
        category: "ELECTRONICS",
        locationFound: "Room 104",
        roomNumber: "104",
        foundDateIso: "2026-10-20T00:00:00Z",
        foundByStaff: "Kamal",
        storageLockerNumber: "Safe S-03",
        status: "HELD_IN_STORAGE",
        guestName: "Lady Sarah",
        guestPhone: "+94771234567",
      };

      const msg = composeGuestLostFoundSms(item, "Cinnamon Wild Yala");
      assert.ok(msg.includes("Dear Lady Sarah"));
      assert.ok(msg.includes("Cinnamon Wild Yala"));
      assert.ok(msg.includes("iPad Pro"));
      assert.ok(msg.includes("Room #104"));
      assert.ok(msg.includes("Safe S-03"));
      assert.ok(msg.includes("+94472239400"));
    });

    it("formats LKR currency strings cleanly with commas and two decimals", () => {
      assert.equal(formatLostFoundLkr(385000), "LKR 385,000.00");
      assert.equal(formatLostFoundLkr(65000.5), "LKR 65,000.50");
    });

    it("resolves Apple HIG styling tokens for categories and statuses", () => {
      assert.ok(resolveLostFoundCategoryBadge("ELECTRONICS").style.includes("blue"));
      assert.ok(resolveLostFoundCategoryBadge("VALUABLES").style.includes("amber"));
      assert.ok(resolveLostFoundCategoryBadge("DOCUMENTS").style.includes("rose"));

      assert.ok(resolveStatusBadge("HELD_IN_STORAGE").style.includes("blue"));
      assert.ok(resolveStatusBadge("GUEST_NOTIFIED").style.includes("amber"));
      assert.ok(resolveStatusBadge("CLAIMED_RETURNED").style.includes("emerald"));
    });
  });

  describe("2. Filtering & Search Matching Helpers", () => {
    it("filters items accurately by status tabs and high-value threshold", () => {
      const highValItem = DEFAULT_LOST_FOUND_ITEMS[0]; // Apple iPhone 15 Pro, HELD_IN_STORAGE, 385,000 LKR
      assert.ok(highValItem);

      assert.equal(isItemMatchingFilterTab(highValItem, "ALL"), true);
      assert.equal(isItemMatchingFilterTab(highValItem, "HELD_IN_STORAGE"), true);
      assert.equal(isItemMatchingFilterTab(highValItem, "GUEST_NOTIFIED"), false);
      assert.equal(isItemMatchingFilterTab(highValItem, "HIGH_VALUE"), true);

      const standardItem = DEFAULT_LOST_FOUND_ITEMS[3]; // Linen Safari Jacket, 28,000 LKR
      assert.ok(standardItem);
      assert.equal(isItemMatchingFilterTab(standardItem, "HIGH_VALUE"), false);
    });

    it("matches search query against reference, item name, locker, room, guest name, and phone", () => {
      const item = DEFAULT_LOST_FOUND_ITEMS[0];
      assert.ok(item);

      assert.equal(isItemMatchingSearchQuery(item, "LNF-2026-042"), true);
      assert.equal(isItemMatchingSearchQuery(item, "iPhone"), true);
      assert.equal(isItemMatchingSearchQuery(item, "Safe S-02"), true);
      assert.equal(isItemMatchingSearchQuery(item, "102"), true);
      assert.equal(isItemMatchingSearchQuery(item, "Sarah"), true);
      assert.equal(isItemMatchingSearchQuery(item, "PA0987654"), true);
      assert.equal(isItemMatchingSearchQuery(item, "NonExistent"), false);
      assert.equal(isItemMatchingSearchQuery(item, ""), true);
    });
  });

  describe("3. React Static Markup & Apple HIG Design Standards", () => {
    it("renders register header, action button, and KPI metrics cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(LostAndFoundView, {
          propertyName: "Cinnamon Wild Yala",
          onSendGuestSms: noop,
          onClaimItem: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Lost &amp; Found Security Register"));
      assert.ok(html.includes("+ Log Found Item"));
      assert.ok(html.includes("Items in Custody"));
      assert.ok(html.includes("High-Value in Safe"));
      assert.ok(html.includes("Awaiting Guest Claim"));
      assert.ok(html.includes("Claimed &amp; Returned"));
      assert.ok(html.includes("Custody Est. Value"));
      assert.ok(html.includes("All Items"));
      assert.ok(html.includes("In Locker Storage"));
    });

    it("renders item cards with locker locations, linked guest phone, and >= 44x44pt buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(LostAndFoundView, {
          initialItems: DEFAULT_LOST_FOUND_ITEMS,
        }),
      );

      assert.ok(html.includes("Apple iPhone 15 Pro"));
      assert.ok(html.includes("LNF-2026-042"));
      assert.ok(html.includes("Executive Safe S-02"));
      assert.ok(html.includes("Lady Sarah Jenkins"));
      assert.ok(html.includes("Send SMS Alert"));
      assert.ok(html.includes("Handover to Guest"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders trilingual localized text in Sinhala and Tamil", () => {
      const textSi = getLostFoundText("si");
      assert.equal(textSi.title, "අස්ථානගත වූ සහ හමුවූ ද්‍රව්‍ය ලේඛනය");
      assert.equal(textSi.sendSmsAction, "SMS පණිවිඩයක් යවන්න");
      assert.equal(textSi.claimReturnAction, "අමුත්තාට භාරදෙන්න");

      const textTa = getLostFoundText("ta");
      assert.equal(textTa.title, "தொலைந்த மற்றும் கண்டெடுக்கப்பட்ட பொருட்கள் பதிவேடு");
      assert.equal(textTa.sendSmsAction, "SMS அனுப்புக");
      assert.equal(textTa.claimReturnAction, "விருந்தினரிடம் ஒப்படை");

      const htmlSi = renderToStaticMarkup(
        React.createElement(LostAndFoundView, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("අස්ථානගත වූ සහ හමුවූ ද්‍රව්‍ය ලේඛනය"));
      assert.ok(htmlSi.includes("SMS පණිවිඩයක් යවන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(LostAndFoundView, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("தொலைந்த மற்றும் கண்டெடுக்கப்பட்ட பொருட்கள் பதிவேடு"));
      assert.ok(htmlTa.includes("SMS அனுப்புக"));
    });
  });
});
