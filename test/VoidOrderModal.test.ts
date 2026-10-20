import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PosCartItem } from "../src/staff/pos/PosTerminalView.js";
import {
  DEFAULT_AUTHORIZED_MANAGERS,
  VoidOrderModal,
  calculateVoidTaxReversal,
  determineInventoryImpact,
  getConfirmButtonLabel,
  getConfirmButtonStyle,
  getDefaultReasonForAction,
  getHeaderBadgeStyle,
  getReasonDetails,
  processPinKeypress,
  validateVoidSubmission,
  verifyManagerPin,
} from "../src/staff/pos/VoidOrderModal.js";

const MOCK_ORDER_ITEMS: readonly PosCartItem[] = [
  {
    id: "item-1",
    menuItemId: "menu-crab-curry",
    name: "Jaffna Crab Curry Pot",
    unitPriceLkr: 4200,
    quantity: 2,
    station: "KITCHEN",
  },
  {
    id: "item-2",
    menuItemId: "menu-lion-lager",
    name: "Lion Lager 625ml",
    unitPriceLkr: 950,
    quantity: 3,
    station: "BAR",
  },
];

describe("Step 291: VoidOrderModal — Order Void, Wastage & Complimentary Manager Approval", () => {
  describe("1. Metadata & Pure Domain Functions", () => {
    it("retrieves reason metadata for known and unknown reason codes", () => {
      const mindReason = getReasonDetails("GUEST_CHANGED_MIND_BEFORE_COOKING");
      assert.strictEqual(mindReason.code, "GUEST_CHANGED_MIND_BEFORE_COOKING");
      assert.strictEqual(mindReason.defaultImpact, "STOCK_PRESERVED");
      assert.ok(mindReason.labelEn.includes("Guest Changed Mind"));

      const spoilageReason = getReasonDetails("KITCHEN_SPOILAGE_DEDUCT_STOCK");
      assert.strictEqual(spoilageReason.code, "KITCHEN_SPOILAGE_DEDUCT_STOCK");
      assert.strictEqual(spoilageReason.defaultImpact, "STOCK_DEDUCTED_WASTAGE");

      // @ts-expect-error test invalid fallback
      const unknownReason = getReasonDetails("NON_EXISTENT_REASON");
      assert.strictEqual(unknownReason.code, "NON_EXISTENT_REASON");
      assert.strictEqual(unknownReason.defaultImpact, "STOCK_PRESERVED");
    });

    it("accurately determines inventory impact for all action types", () => {
      // Complimentary forces STOCK_DEDUCTED_COMP
      assert.strictEqual(
        determineInventoryImpact("COMPLIMENTARY_APPROVAL", "MANAGEMENT_COMPLIMENTARY"),
        "STOCK_DEDUCTED_COMP",
      );

      // Kitchen wastage forces STOCK_DEDUCTED_WASTAGE
      assert.strictEqual(
        determineInventoryImpact("KITCHEN_WASTAGE", "GUEST_CHANGED_MIND_BEFORE_COOKING"),
        "STOCK_DEDUCTED_WASTAGE",
      );

      // Full order void respects the reason's default impact
      assert.strictEqual(
        determineInventoryImpact("FULL_ORDER_VOID", "GUEST_CHANGED_MIND_BEFORE_COOKING"),
        "STOCK_PRESERVED",
      );
      assert.strictEqual(
        determineInventoryImpact("FULL_ORDER_VOID", "KITCHEN_SPOILAGE_DEDUCT_STOCK"),
        "STOCK_DEDUCTED_WASTAGE",
      );
    });

    it("calculates 4-stage compounding tax reversals on base void amounts", () => {
      const taxReversal = calculateVoidTaxReversal(10000, "DINE_IN", 310);
      assert.strictEqual(taxReversal.grossSubtotalLkr, 10000);
      assert.strictEqual(taxReversal.serviceChargeLkr, 1000); // 10%
      assert.strictEqual(taxReversal.tdlLkr, 110); // 1% on (10000 + 1000)
      assert.strictEqual(taxReversal.ssclLkr, 275); // 2.5% on (11000)
      assert.strictEqual(taxReversal.vatLkr, 2049.3); // 18% on (11000 + 110 + 275)
      assert.strictEqual(taxReversal.grandTotalLkr, 13434.3);
    });

    it("verifies manager 4-digit PIN against authorized staff directory", () => {
      const nuwan = verifyManagerPin("9944", DEFAULT_AUTHORIZED_MANAGERS);
      assert.ok(nuwan);
      assert.strictEqual(nuwan.name, "Nuwan Silva");
      assert.strictEqual(nuwan.roleTitle, "F&B Director");

      const chef = verifyManagerPin("1234", DEFAULT_AUTHORIZED_MANAGERS);
      assert.ok(chef);
      assert.strictEqual(chef.name, "Chaminda Fernando");

      // Invalid PINs
      assert.strictEqual(verifyManagerPin("0000", DEFAULT_AUTHORIZED_MANAGERS), null);
      assert.strictEqual(verifyManagerPin("12", DEFAULT_AUTHORIZED_MANAGERS), null);
      assert.strictEqual(verifyManagerPin("", DEFAULT_AUTHORIZED_MANAGERS), null);
    });

    it("validates void submission criteria including manager PIN and reason notes", () => {
      const validMgr = DEFAULT_AUTHORIZED_MANAGERS[0];
      assert.ok(validMgr);

      // Rejects without manager authorization
      const noMgr = validateVoidSubmission({
        actionType: "FULL_ORDER_VOID",
        reasonCode: "GUEST_CHANGED_MIND_BEFORE_COOKING",
        manager: null,
        itemsVoidedCount: 2,
      });
      assert.strictEqual(noMgr.isValid, false);
      assert.ok(noMgr.errorMessage?.includes("Manager PIN required"));

      // Rejects with zero items selected
      const zeroItems = validateVoidSubmission({
        actionType: "LINE_ITEM_VOID",
        reasonCode: "GUEST_CHANGED_MIND_BEFORE_COOKING",
        manager: validMgr,
        itemsVoidedCount: 0,
      });
      assert.strictEqual(zeroItems.isValid, false);
      assert.ok(zeroItems.errorMessage?.includes("At least one item"));

      // Rejects OTHER without explanation note
      const emptyOther = validateVoidSubmission({
        actionType: "FULL_ORDER_VOID",
        reasonCode: "OTHER",
        customReasonNote: "    ",
        manager: validMgr,
        itemsVoidedCount: 1,
      });
      assert.strictEqual(emptyOther.isValid, false);
      assert.ok(emptyOther.errorMessage?.includes("Detailed note"));

      // Valid approval
      const valid = validateVoidSubmission({
        actionType: "FULL_ORDER_VOID",
        reasonCode: "ORDER_DUPLICATION",
        manager: validMgr,
        itemsVoidedCount: 1,
      });
      assert.strictEqual(valid.isValid, true);
    });

    it("processes keypad keypress events for PIN input", () => {
      assert.strictEqual(processPinKeypress("", "1"), "1");
      assert.strictEqual(processPinKeypress("12", "3"), "123");
      assert.strictEqual(processPinKeypress("123", "4"), "1234");
      assert.strictEqual(processPinKeypress("1234", "5"), "1234"); // Clamps at 4
      assert.strictEqual(processPinKeypress("123", "DEL"), "12");
      assert.strictEqual(processPinKeypress("123", "CLEAR"), "");
    });

    it("returns correct dynamic styling and defaults based on action type", () => {
      assert.ok(getHeaderBadgeStyle("COMPLIMENTARY_APPROVAL").includes("emerald"));
      assert.ok(getHeaderBadgeStyle("KITCHEN_WASTAGE").includes("amber"));
      assert.ok(getHeaderBadgeStyle("FULL_ORDER_VOID").includes("rose"));

      assert.ok(getConfirmButtonStyle("COMPLIMENTARY_APPROVAL").includes("emerald"));
      assert.ok(getConfirmButtonStyle("KITCHEN_WASTAGE").includes("amber"));
      assert.ok(getConfirmButtonStyle("FULL_ORDER_VOID").includes("rose"));

      assert.strictEqual(
        getDefaultReasonForAction("COMPLIMENTARY_APPROVAL"),
        "MANAGEMENT_COMPLIMENTARY",
      );
      assert.strictEqual(
        getDefaultReasonForAction("KITCHEN_WASTAGE"),
        "KITCHEN_SPOILAGE_DEDUCT_STOCK",
      );
      assert.strictEqual(
        getDefaultReasonForAction("FULL_ORDER_VOID"),
        "GUEST_CHANGED_MIND_BEFORE_COOKING",
      );

      const mockT: Parameters<typeof getConfirmButtonLabel>[1] = {
        title: "",
        subtitle: "",
        actionType: "",
        fullVoid: "",
        lineVoid: "",
        wastage: "",
        comp: "",
        itemsToVoid: "",
        reasonTitle: "",
        pinTitle: "",
        pinPlaceholder: "",
        authorizedBy: "",
        customNoteLabel: "",
        customNotePlaceholder: "",
        stockPreservedNotice: "",
        stockWastageNotice: "",
        stockCompNotice: "",
        folioReversalNotice: "",
        cancel: "",
        confirmVoid: "Approve Void",
        confirmComp: "Approve Comp",
        confirmWastage: "Record Spoilage",
        clear: "",
        del: "",
        invalidPin: "",
        baseSubtotal: "",
        taxReversal: "",
        totalReversed: "",
      };
      assert.strictEqual(getConfirmButtonLabel("COMPLIMENTARY_APPROVAL", mockT), "Approve Comp");
      assert.strictEqual(getConfirmButtonLabel("KITCHEN_WASTAGE", mockT), "Record Spoilage");
      assert.strictEqual(getConfirmButtonLabel("FULL_ORDER_VOID", mockT), "Approve Void");
    });
  });

  describe("2. React Static Markup Rendering", () => {
    it("renders modal dialog with header, reasons, keypad, and action buttons when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(VoidOrderModal, {
          isOpen: true,
          onClose: () => {
            /* no-op */
          },
          orderId: "ord-901",
          destination: "Table 04",
          orderItems: MOCK_ORDER_ITEMS,
          onConfirmVoid: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("Order Void &amp; Spoilage Approval"));
      assert.ok(html.includes("Table 04 • Ticket #ord-901"));
      assert.ok(html.includes("Guest Changed Mind"));
      assert.ok(html.includes("Stock Preserved"));
      assert.ok(html.includes("Clear"));
      assert.ok(html.includes("Delete"));
    });

    it("renders room folio reversal notice when order is charged to room", () => {
      const html = renderToStaticMarkup(
        React.createElement(VoidOrderModal, {
          isOpen: true,
          onClose: () => {
            /* no-op */
          },
          orderId: "ord-902",
          destination: "Room 204",
          orderItems: MOCK_ORDER_ITEMS,
          isChargedToRoom: true,
          guestRoomNumber: "Room 204",
          orderType: "ROOM_CHARGE",
          onConfirmVoid: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("Room Folio Charge Reversal (Room 204)"));
      assert.ok(html.includes("Full charges and taxes will be credited back"));
    });

    it("renders Sinhala localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(VoidOrderModal, {
          isOpen: true,
          onClose: () => {
            /* no-op */
          },
          orderId: "ord-903",
          destination: "Pool Cabana 01",
          orderItems: MOCK_ORDER_ITEMS,
          language: "si",
          onConfirmVoid: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("ඇණවුම අවලංගු කිරීම සහ නාස්තිය අනුමැතිය"));
      assert.ok(html.includes("මුළු ඇණවුම අවලංගු කරන්න"));
      assert.ok(html.includes("මකන්න")); // Clear
      assert.ok(html.includes("ඉවත් කරන්න")); // Del
    });

    it("renders Tamil localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(VoidOrderModal, {
          isOpen: true,
          onClose: () => {
            /* no-op */
          },
          orderId: "ord-904",
          destination: "Main Restaurant T10",
          orderItems: MOCK_ORDER_ITEMS,
          language: "ta",
          onConfirmVoid: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("ஆர்டர் ரத்து மற்றும் வீணடிப்பு ஒப்புதல்"));
      assert.ok(html.includes("முழு ஆர்டரையும் ரத்து செய்"));
      assert.ok(html.includes("அழி")); // Clear
      assert.ok(html.includes("நீக்கு")); // Del
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(VoidOrderModal, {
          isOpen: false,
          onClose: () => {
            /* no-op */
          },
          orderId: "ord-905",
          destination: "Table 01",
          orderItems: MOCK_ORDER_ITEMS,
          onConfirmVoid: () => {
            /* no-op */
          },
        }),
      );

      assert.strictEqual(html, "");
    });
  });
});
