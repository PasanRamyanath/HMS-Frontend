import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_FLOOR_SHEET_METADATA,
  DEFAULT_FLOOR_SHEET_ROOMS,
  type HkFloorSheetRoom,
  PrintableHkFloorSheet,
  calculateFloorSheetSummary,
  filterFloorSheetRooms,
  getFloorSheetText,
  resolveInspectionBadge,
  resolveLinenOptionBadge,
  resolveRoomStatusBadge,
  resolveVipBadge,
} from "../src/admin/housekeeping/PrintableHkFloorSheet.js";

const noop = () => undefined;

describe("Step 322: Printable Daily Housekeeping Floor Sheet (PrintableHkFloorSheet.tsx)", () => {
  describe("1. Summary Metrics & Workload Calculations", () => {
    it("calculates summary metrics accurately for default floor sheet rooms", () => {
      const summary = calculateFloorSheetSummary(DEFAULT_FLOOR_SHEET_ROOMS);

      assert.equal(summary.totalRooms, 8);
      // Checkouts: rm-201, rm-203
      assert.equal(summary.checkoutCount, 2);
      // Stayovers (STAYOVER or OCCUPIED_DIRTY): rm-202, rm-204
      assert.equal(summary.stayoverCount, 2);
      // Vacant dirty: rm-205
      assert.equal(summary.vacantDirtyCount, 1);
      // VIPs (excluding REGULAR): rm-201 (VIP1), rm-202 (REPEAT_GUEST), rm-204 (HONEYMOON), rm-207 (VIP3) -> 4
      assert.equal(summary.vipCount, 4);
      // Deep clean: rm-206
      assert.equal(summary.deepCleanCount, 1);
      // Expected arrival: rm-207
      assert.equal(summary.expectedArrivalsCount, 1);
      // Total workload credits: 1.5 + 1.0 + 1.5 + 1.0 + 1.2 + 2.0 + 1.5 + 1.0 = 10.7
      assert.equal(summary.totalCredits, 10.7);
      // Est hours: (10.7 * 30) / 60 = 5.35 -> 5.4 or 5.3 depending on toFixed(1)
      assert.equal(summary.estimatedHours, 5.4);
      // Completed rooms: rm-201, rm-202, rm-203, rm-208 (PASSED)
      assert.equal(summary.inspectedPassedCount, 4);
      assert.equal(summary.completedCount, 4);
      // Completion %: 4 / 8 = 50%
      assert.equal(summary.completionPct, 50);
    });

    it("handles an empty rooms array gracefully with zeroed summary", () => {
      const summary = calculateFloorSheetSummary([]);
      assert.equal(summary.totalRooms, 0);
      assert.equal(summary.checkoutCount, 0);
      assert.equal(summary.stayoverCount, 0);
      assert.equal(summary.vacantDirtyCount, 0);
      assert.equal(summary.vipCount, 0);
      assert.equal(summary.deepCleanCount, 0);
      assert.equal(summary.expectedArrivalsCount, 0);
      assert.equal(summary.totalCredits, 0);
      assert.equal(summary.estimatedHours, 0);
      assert.equal(summary.completedCount, 0);
      assert.equal(summary.inspectedPassedCount, 0);
      assert.equal(summary.completionPct, 0);
    });
  });

  describe("2. Filtering & Search Logic", () => {
    it("filters rooms by specific floor number or ALL floors", () => {
      const floor2Rooms = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, 2, "ALL");
      assert.equal(floor2Rooms.length, 8);

      const floor3Rooms = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, 3, "ALL");
      assert.equal(floor3Rooms.length, 0);

      const allRooms = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "ALL");
      assert.equal(allRooms.length, 8);
    });

    it("filters rooms by status filter tabs", () => {
      // DIRTY includes VACANT_DIRTY, OCCUPIED_DIRTY, CHECKOUT
      // In sample: rm-201 (CHECKOUT), rm-203 (CHECKOUT), rm-204 (OCCUPIED_DIRTY), rm-205 (VACANT_DIRTY) -> 4
      const dirtyRooms = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "DIRTY");
      assert.equal(dirtyRooms.length, 4);

      // CHECKOUT filter: rm-201, rm-203 -> 2
      const checkouts = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "CHECKOUT");
      assert.equal(checkouts.length, 2);

      // STAYOVER filter: rm-202 (STAYOVER), rm-204 (OCCUPIED_DIRTY) -> 2
      const stayovers = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "STAYOVER");
      assert.equal(stayovers.length, 2);

      // VIP filter: rm-201, rm-202, rm-204, rm-207 -> 4
      const vips = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "VIP");
      assert.equal(vips.length, 4);

      // COMPLETED filter: rm-201, rm-202, rm-203, rm-208 -> 4
      const completed = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "COMPLETED");
      assert.equal(completed.length, 4);
    });

    it("searches rooms across room number, guest name, room type, and special requests", () => {
      const byNumber = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "ALL", "201");
      assert.equal(byNumber.length, 1);
      assert.equal(byNumber[0]?.roomNumber, "201");

      const byGuest = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "ALL", "wright");
      assert.equal(byGuest.length, 1);
      assert.equal(byGuest[0]?.guestName, "Alexander Wright");

      const byType = filterFloorSheetRooms(DEFAULT_FLOOR_SHEET_ROOMS, "ALL", "ALL", "colonial");
      assert.equal(byType.length, 1);
      assert.equal(byType[0]?.roomNumber, "202");

      const bySpecialRequest = filterFloorSheetRooms(
        DEFAULT_FLOOR_SHEET_ROOMS,
        "ALL",
        "ALL",
        "cinnamon",
      );
      assert.equal(bySpecialRequest.length, 1);
      assert.equal(bySpecialRequest[0]?.roomNumber, "207");

      const noMatch = filterFloorSheetRooms(
        DEFAULT_FLOOR_SHEET_ROOMS,
        "ALL",
        "ALL",
        "non-existent-xyz",
      );
      assert.equal(noMatch.length, 0);
    });
  });

  describe("3. Visual Status & Badge Resolvers", () => {
    it("resolves status badges correctly for each housekeeping room status", () => {
      const checkout = resolveRoomStatusBadge("CHECKOUT");
      assert.equal(checkout.label, "Checkout Clean");
      assert.equal(checkout.icon, "🚪");

      const stayover = resolveRoomStatusBadge("STAYOVER");
      assert.equal(stayover.label, "Stayover Tidy");
      assert.equal(stayover.icon, "🛏️");

      const vacant = resolveRoomStatusBadge("VACANT_DIRTY");
      assert.equal(vacant.label, "Vacant Dirty");

      const arrival = resolveRoomStatusBadge("EXPECTED_ARRIVAL");
      assert.equal(arrival.label, "Expected Arrival");

      const deepClean = resolveRoomStatusBadge("DEEP_CLEAN");
      assert.equal(deepClean.label, "Deep Clean Due");

      const clean = resolveRoomStatusBadge("INSPECTED_CLEAN");
      assert.equal(clean.label, "Inspected Clean");
      assert.equal(clean.icon, "✅");
    });

    it("resolves linen protocol options", () => {
      const full = resolveLinenOptionBadge("FULL_CHANGE");
      assert.equal(full.label, "Full Change");
      assert.equal(full.icon, "🔄");

      const eco = resolveLinenOptionBadge("ECO_REUSE");
      assert.equal(eco.label, "Eco-Reuse (Tidy)");
      assert.equal(eco.icon, "🌿");

      const towels = resolveLinenOptionBadge("TOWELS_ONLY");
      assert.equal(towels.label, "Towels Only");

      const turndown = resolveLinenOptionBadge("TURNDOWN_ONLY");
      assert.equal(turndown.label, "Turndown Only");
    });

    it("resolves VIP tiers and returns null for regular guests", () => {
      assert.equal(resolveVipBadge(undefined), null);
      assert.equal(resolveVipBadge("REGULAR"), null);

      const vip1 = resolveVipBadge("VIP1");
      assert.ok(vip1);
      assert.equal(vip1?.label, "VIP 1 (Silver)");

      const vip3 = resolveVipBadge("VIP3");
      assert.ok(vip3);
      assert.equal(vip3?.label, "VIP 3 (Platinum)");

      const honeymoon = resolveVipBadge("HONEYMOON");
      assert.ok(honeymoon);
      assert.equal(honeymoon?.label, "Honeymooners");

      const repeatGuest = resolveVipBadge("REPEAT_GUEST");
      assert.ok(repeatGuest);
      assert.equal(repeatGuest?.label, "Repeat Patron");
    });

    it("resolves supervisor inspection status badges", () => {
      assert.equal(resolveInspectionBadge("PASSED").label, "Passed");
      assert.equal(resolveInspectionBadge("TOUCH_UP_REQUIRED").label, "Touch-Up Req.");
      assert.equal(resolveInspectionBadge("PENDING").label, "Pending");
    });
  });

  describe("4. Multi-Language Translations", () => {
    it("returns English translations by default", () => {
      const en = getFloorSheetText("en");
      assert.equal(en.title, "Daily Housekeeping Floor Sheet");
      assert.equal(en.printButton, "Print Clipboard Sheet");
      assert.ok(en.sltdaComplianceFooter.includes("SLTDA"));
    });

    it("returns Sinhala translations accurately", () => {
      const si = getFloorSheetText("si");
      assert.equal(si.title, "දෛනික කාමර පිරිසිදු කිරීමේ ලේඛනය");
      assert.equal(si.printButton, "ලේඛනය මුද්‍රණය කරන්න");
      assert.ok(si.sltdaComplianceFooter.includes("ශ්‍රී ලංකා සංචාරක සංවර්ධන අධිකාරිය"));
    });

    it("returns Tamil translations accurately", () => {
      const ta = getFloorSheetText("ta");
      assert.equal(ta.title, "தினசரி தூய்மைப்பணி தாள்");
      assert.equal(ta.printButton, "தாளை அச்சிடுக");
      assert.ok(ta.sltdaComplianceFooter.includes("இலங்கை சுற்றுலா அபிவிருத்தி அதிகாரசபை"));
    });
  });

  describe("5. Component Static Rendering & UI Verification", () => {
    it("renders printable housekeeping floor sheet with default fixtures", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableHkFloorSheet, {
          metadata: DEFAULT_FLOOR_SHEET_METADATA,
          initialRooms: DEFAULT_FLOOR_SHEET_ROOMS,
          language: "en",
          onPrintSheet: noop,
        }),
      );

      // Verify title & property title
      assert.ok(html.includes("Daily Housekeeping Floor Sheet"));
      assert.ok(html.includes("Galle Face Heritage Hotel &amp; Spa - Colombo"));
      assert.ok(html.includes("SLTDA/HOTEL/2026/0014"));
      assert.ok(html.includes("Sunil Bandara"));
      assert.ok(html.includes("Chaminda Silva"));

      // Verify rooms rendered
      assert.ok(html.includes("201"));
      assert.ok(html.includes("Alexander Wright"));
      assert.ok(html.includes("202"));
      assert.ok(html.includes("Dr. Rohitha Perera"));

      // Verify KPI workload summary
      assert.ok(html.includes("10.7 credits"));
      assert.ok(html.includes("5.4 hrs"));

      // Verify SLTDA compliance text
      assert.ok(html.includes("(SLTDA) Standards &amp; Hygiene Compliance Protocol"));
    });

    it("renders empty room state when no rooms are provided", () => {
      const emptyRooms: HkFloorSheetRoom[] = [];
      const html = renderToStaticMarkup(
        React.createElement(PrintableHkFloorSheet, {
          initialRooms: emptyRooms,
          language: "en",
        }),
      );

      assert.ok(html.includes("No rooms match the selected floor or status filter."));
      assert.ok(html.includes("0 credits"));
    });
  });
});
